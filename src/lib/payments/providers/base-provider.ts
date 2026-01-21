import type {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentProviderType,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  RefundRequest,
  PaymentResult,
  PaymentInstructions,
} from '../types';

/**
 * Base class for payment providers
 * Provides common functionality and enforces the interface
 */
export abstract class BasePaymentProvider implements PaymentProvider {
  abstract readonly type: PaymentProviderType;
  abstract readonly config: PaymentProviderConfig;

  protected initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  isAvailable(): boolean {
    return this.initialized && this.config.isEnabled;
  }

  abstract createPayment(request: CreatePaymentRequest): Promise<PaymentResult>;
  abstract confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentResult>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentResult>;
  abstract cancelPayment(paymentId: string): Promise<PaymentResult>;
  abstract refundPayment(request: RefundRequest): Promise<PaymentResult>;
  abstract getPaymentInstructions(): PaymentInstructions;

  /**
   * Validate payment amount against provider limits
   */
  protected validateAmount(amount: number, currency: string): string | null {
    if (!this.config.supportedCurrencies.includes(currency)) {
      return `Currency ${currency} is not supported by ${this.config.displayName}`;
    }

    if (this.config.minAmount && amount < this.config.minAmount) {
      return `Minimum amount is ${this.config.minAmount} ${currency}`;
    }

    if (this.config.maxAmount && amount > this.config.maxAmount) {
      return `Maximum amount is ${this.config.maxAmount} ${currency}`;
    }

    return null;
  }

  /**
   * Generate a unique payment reference
   */
  protected generatePaymentReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.type.toUpperCase()}-${timestamp}-${random}`.toUpperCase();
  }
}
