import type {
  PaymentProvider,
  PaymentProviderType,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  RefundRequest,
  PaymentResult,
  PaymentProviderConfig,
  PaymentEventHandler,
  PaymentEvent,
} from './types';
import { BankTransferProvider } from './providers/bank-transfer-provider';
import { StripeProvider } from './providers/stripe-provider';

/**
 * Payment Service
 * Centralized service for managing payment providers and processing payments
 */
class PaymentService {
  private providers: Map<PaymentProviderType, PaymentProvider> = new Map();
  private eventHandlers: PaymentEventHandler[] = [];
  private initialized = false;

  /**
   * Initialize all payment providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register available providers
    const bankTransfer = new BankTransferProvider();
    const stripe = new StripeProvider();

    await bankTransfer.initialize();
    await stripe.initialize();

    this.providers.set('bank_transfer', bankTransfer);
    this.providers.set('stripe', stripe);

    this.initialized = true;
    console.log('Payment service initialized');
  }

  /**
   * Get a specific provider
   */
  getProvider(type: PaymentProviderType): PaymentProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all available (enabled) providers
   */
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isAvailable());
  }

  /**
   * Get all provider configurations (including disabled ones)
   */
  getAllProviderConfigs(): PaymentProviderConfig[] {
    return Array.from(this.providers.values()).map(p => p.config);
  }

  /**
   * Get the default/preferred provider
   */
  getDefaultProvider(): PaymentProvider | undefined {
    // Return first available provider (bank_transfer is priority)
    const available = this.getAvailableProviders();
    return available.find(p => p.type === 'bank_transfer') || available[0];
  }

  /**
   * Create a payment using a specific provider
   */
  async createPayment(
    providerType: PaymentProviderType,
    request: CreatePaymentRequest
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerType);
    
    if (!provider) {
      return {
        success: false,
        status: 'failed',
        error: `Proveedor de pago '${providerType}' no encontrado`,
      };
    }

    if (!provider.isAvailable()) {
      return {
        success: false,
        status: 'failed',
        error: `Proveedor de pago '${provider.config.displayName}' no está disponible`,
      };
    }

    const result = await provider.createPayment(request);

    if (result.success && result.paymentId) {
      this.emitEvent({
        type: 'payment.created',
        paymentId: result.paymentId,
        provider: providerType,
        timestamp: new Date(),
        data: result,
      });
    }

    return result;
  }

  /**
   * Confirm a pending payment
   */
  async confirmPayment(
    providerType: PaymentProviderType,
    request: ConfirmPaymentRequest
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerType);
    
    if (!provider) {
      return {
        success: false,
        status: 'failed',
        error: 'Proveedor no encontrado',
      };
    }

    const result = await provider.confirmPayment(request);

    if (result.success) {
      this.emitEvent({
        type: 'payment.confirmed',
        paymentId: request.paymentId,
        provider: providerType,
        timestamp: new Date(),
        data: result,
      });
    }

    return result;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    providerType: PaymentProviderType,
    paymentId: string
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerType);
    
    if (!provider) {
      return {
        success: false,
        status: 'failed',
        error: 'Proveedor no encontrado',
      };
    }

    return provider.getPaymentStatus(paymentId);
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    providerType: PaymentProviderType,
    paymentId: string
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerType);
    
    if (!provider) {
      return {
        success: false,
        status: 'failed',
        error: 'Proveedor no encontrado',
      };
    }

    const result = await provider.cancelPayment(paymentId);

    if (result.success) {
      this.emitEvent({
        type: 'payment.cancelled',
        paymentId,
        provider: providerType,
        timestamp: new Date(),
        data: result,
      });
    }

    return result;
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    providerType: PaymentProviderType,
    request: RefundRequest
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerType);
    
    if (!provider) {
      return {
        success: false,
        status: 'failed',
        error: 'Proveedor no encontrado',
      };
    }

    const result = await provider.refundPayment(request);

    if (result.success) {
      this.emitEvent({
        type: 'payment.refunded',
        paymentId: request.paymentId,
        provider: providerType,
        timestamp: new Date(),
        data: result,
      });
    }

    return result;
  }

  /**
   * Subscribe to payment events
   */
  onPaymentEvent(handler: PaymentEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private emitEvent(event: PaymentEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in payment event handler:', error);
      }
    });
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

// Export types and providers
export * from './types';
export * from './providers';
