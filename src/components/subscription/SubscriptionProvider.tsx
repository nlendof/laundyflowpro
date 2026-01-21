import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSubscription, SubscriptionCheckResult } from '@/hooks/useSubscription';
import { PaymentReminderDialog } from './PaymentReminderDialog';

interface SubscriptionContextType {
  checkResult: SubscriptionCheckResult | null;
  loading: boolean;
  validateOperation: (onProceed?: () => void) => boolean;
  showPaymentReminder: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { checkResult, loading, shouldShowPaymentReminder, isOperationBlocked } = useSubscription();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [pendingProceed, setPendingProceed] = useState<(() => void) | null>(null);

  const showPaymentReminder = useCallback(() => {
    setReminderOpen(true);
  }, []);

  const validateOperation = useCallback((onProceed?: () => void): boolean => {
    // If loading, allow operation (optimistic)
    if (loading || !checkResult) {
      return true;
    }

    // If suspended, block and show dialog
    if (isOperationBlocked()) {
      setReminderOpen(true);
      return false;
    }

    // If in grace period, show reminder but allow to proceed
    if (shouldShowPaymentReminder()) {
      setPendingProceed(() => onProceed || null);
      setReminderOpen(true);
      return false; // Will proceed via dialog
    }

    return true;
  }, [loading, checkResult, isOperationBlocked, shouldShowPaymentReminder]);

  const handleProceed = useCallback(() => {
    if (pendingProceed) {
      pendingProceed();
      setPendingProceed(null);
    }
    setReminderOpen(false);
  }, [pendingProceed]);

  const handleClose = useCallback(() => {
    setPendingProceed(null);
    setReminderOpen(false);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        checkResult,
        loading,
        validateOperation,
        showPaymentReminder
      }}
    >
      {children}
      
      {checkResult && (
        <PaymentReminderDialog
          open={reminderOpen}
          onClose={handleClose}
          onProceed={pendingProceed ? handleProceed : undefined}
          checkResult={checkResult}
        />
      )}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
}
