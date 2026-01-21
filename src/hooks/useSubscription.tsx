import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/contexts/LaundryContext';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type BillingInterval = 'monthly' | 'annual';
export type PaymentMethodType = 'card' | 'bank_transfer';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  trial_days: number;
  grace_period_days: number;
  features: string[];
  is_active: boolean;
}

export interface BranchSubscription {
  id: string;
  branch_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_anchor_day: number | null;
  last_payment_at: string | null;
  next_payment_due: string | null;
  past_due_since: string | null;
  suspended_at: string | null;
  cancelled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  preferred_payment_method: PaymentMethodType | null;
  plan?: SubscriptionPlan;
}

export interface SubscriptionCheckResult {
  canOperate: boolean;
  isInGracePeriod: boolean;
  daysUntilSuspension: number;
  status: SubscriptionStatus;
  message: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  branch_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethodType;
  status: string;
  period_start: string;
  period_end: string;
  invoice_number: string | null;
  created_at: string;
}

export function useSubscription() {
  const { branchId } = useBranchFilter();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<BranchSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<SubscriptionCheckResult | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch subscription with plan
      const { data: subData, error: subError } = await supabase
        .from('branch_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('branch_id', branchId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      }

      if (subData) {
        setSubscription(subData as unknown as BranchSubscription);
        setPlan(subData.plan as unknown as SubscriptionPlan);
      }

      // Check subscription status using database function
      const { data: checkData, error: checkError } = await supabase
        .rpc('check_branch_subscription_status', { p_branch_id: branchId });

      if (checkError) {
        console.error('Error checking subscription status:', checkError);
      } else if (checkData && checkData.length > 0) {
        const result = checkData[0];
        setCheckResult({
          canOperate: result.can_operate,
          isInGracePeriod: result.is_in_grace_period,
          daysUntilSuspension: result.days_until_suspension,
          status: result.status,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in fetchSubscription:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const fetchPayments = useCallback(async () => {
    if (!subscription?.id) return;

    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
    } else {
      setPayments(data as SubscriptionPayment[]);
    }
  }, [subscription?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (subscription) {
      fetchPayments();
    }
  }, [subscription, fetchPayments]);

  // Check if user can manage subscription (admin or branch admin)
  const canManageSubscription = useCallback(() => {
    if (!user) return false;
    return user.role === 'owner' || user.role === 'admin';
  }, [user]);

  // Get days remaining in trial
  const getTrialDaysRemaining = useCallback(() => {
    if (!subscription?.trial_ends_at) return 0;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  // Check if should show payment reminder
  const shouldShowPaymentReminder = useCallback(() => {
    if (!checkResult) return false;
    return checkResult.isInGracePeriod || checkResult.status === 'past_due';
  }, [checkResult]);

  // Check if operations are blocked
  const isOperationBlocked = useCallback(() => {
    if (!checkResult) return false;
    return !checkResult.canOperate;
  }, [checkResult]);

  return {
    subscription,
    plan,
    payments,
    loading,
    checkResult,
    canManageSubscription,
    getTrialDaysRemaining,
    shouldShowPaymentReminder,
    isOperationBlocked,
    refetch: fetchSubscription
  };
}

// Hook for subscription plans
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching plans:', error);
      } else {
        setPlans(data as SubscriptionPlan[]);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  return { plans, loading };
}
