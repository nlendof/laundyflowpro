import { useState, useEffect, useCallback } from 'react';
import { paymentService, PaymentProviderType, PaymentProviderConfig, PaymentInstructions, PaymentResult, CreatePaymentRequest } from '@/lib/payments';

/**
 * Hook for using the payment service
 * Provides access to payment providers and payment operations
 */
export function usePaymentService() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableProviders, setAvailableProviders] = useState<PaymentProviderConfig[]>([]);
  const [allProviders, setAllProviders] = useState<PaymentProviderConfig[]>([]);

  useEffect(() => {
    const initializeService = async () => {
      try {
        await paymentService.initialize();
        setAvailableProviders(
          paymentService.getAvailableProviders().map(p => p.config)
        );
        setAllProviders(paymentService.getAllProviderConfigs());
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing payment service:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeService();
  }, []);

  const createPayment = useCallback(
    async (
      providerType: PaymentProviderType,
      request: CreatePaymentRequest
    ): Promise<PaymentResult> => {
      if (!initialized) {
        return {
          success: false,
          status: 'failed',
          error: 'Servicio de pagos no inicializado',
        };
      }
      return paymentService.createPayment(providerType, request);
    },
    [initialized]
  );

  const confirmPayment = useCallback(
    async (
      providerType: PaymentProviderType,
      paymentId: string,
      receiptUrl?: string
    ): Promise<PaymentResult> => {
      if (!initialized) {
        return {
          success: false,
          status: 'failed',
          error: 'Servicio de pagos no inicializado',
        };
      }
      return paymentService.confirmPayment(providerType, {
        paymentId,
        receiptUrl,
      });
    },
    [initialized]
  );

  const getPaymentInstructions = useCallback(
    (providerType: PaymentProviderType): PaymentInstructions | null => {
      const provider = paymentService.getProvider(providerType);
      return provider?.getPaymentInstructions() || null;
    },
    []
  );

  const getDefaultProviderType = useCallback((): PaymentProviderType => {
    const defaultProvider = paymentService.getDefaultProvider();
    return defaultProvider?.type || 'bank_transfer';
  }, []);

  const isProviderAvailable = useCallback(
    (providerType: PaymentProviderType): boolean => {
      const provider = paymentService.getProvider(providerType);
      return provider?.isAvailable() || false;
    },
    []
  );

  return {
    initialized,
    loading,
    availableProviders,
    allProviders,
    createPayment,
    confirmPayment,
    getPaymentInstructions,
    getDefaultProviderType,
    isProviderAvailable,
  };
}
