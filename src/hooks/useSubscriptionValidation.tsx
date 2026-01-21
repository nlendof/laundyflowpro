import { useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

/**
 * Hook to validate subscription status before critical operations
 * Returns a function that checks if the operation can proceed
 */
export function useSubscriptionValidation() {
  const { checkResult, loading } = useSubscription();

  /**
   * Validates if an operation (create order, make sale) can proceed
   * @returns { canProceed: boolean, shouldShowReminder: boolean, isSuspended: boolean }
   */
  const validateOperation = useCallback(() => {
    // If loading or no result, allow operation (optimistic)
    if (loading || !checkResult) {
      return { canProceed: true, shouldShowReminder: false, isSuspended: false };
    }

    // If subscription is suspended or cancelled
    if (checkResult.status === 'suspended' || checkResult.status === 'cancelled') {
      return { 
        canProceed: false, 
        shouldShowReminder: true, 
        isSuspended: true 
      };
    }

    // If in grace period (past_due)
    if (checkResult.isInGracePeriod || checkResult.status === 'past_due') {
      return { 
        canProceed: true, // Can proceed but should show reminder
        shouldShowReminder: true, 
        isSuspended: false 
      };
    }

    // Trial or Active - allow
    return { canProceed: true, shouldShowReminder: false, isSuspended: false };
  }, [checkResult, loading]);

  /**
   * Quick check if operations are blocked
   */
  const isBlocked = useCallback(() => {
    if (loading || !checkResult) return false;
    return checkResult.status === 'suspended' || checkResult.status === 'cancelled';
  }, [checkResult, loading]);

  /**
   * Check if should show payment reminder
   */
  const shouldShowReminder = useCallback(() => {
    if (loading || !checkResult) return false;
    return checkResult.isInGracePeriod || checkResult.status === 'past_due';
  }, [checkResult, loading]);

  /**
   * Get subscription status info for UI
   */
  const getStatusInfo = useCallback(() => {
    if (loading || !checkResult) {
      return {
        status: 'loading' as const,
        message: 'Verificando suscripción...',
        daysRemaining: 0
      };
    }

    return {
      status: checkResult.status,
      message: checkResult.message,
      daysRemaining: checkResult.daysUntilSuspension
    };
  }, [checkResult, loading]);

  return {
    validateOperation,
    isBlocked,
    shouldShowReminder,
    getStatusInfo,
    checkResult,
    loading
  };
}
