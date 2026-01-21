/**
 * Payment Provider Abstraction Layer
 * Allows switching between payment providers (Bank Transfer, Stripe, etc.)
 */

export type PaymentProviderType = 'bank_transfer' | 'stripe' | 'paypal';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface PaymentAmount {
  amount: number;
  currency: string;
}

export interface PaymentCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface PaymentMetadata {
  subscriptionId?: string;
  branchId?: string;
  invoiceNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  [key: string]: string | undefined;
}

export interface CreatePaymentRequest {
  amount: PaymentAmount;
  customer: PaymentCustomer;
  description: string;
  metadata?: PaymentMetadata;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status: PaymentStatus;
  providerReference?: string;
  redirectUrl?: string;
  error?: string;
  requiresAction?: boolean;
  actionType?: 'redirect' | 'confirm' | 'upload_receipt';
  actionData?: Record<string, unknown>;
}

export interface ConfirmPaymentRequest {
  paymentId: string;
  providerReference?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: PaymentAmount; // Partial refund if provided
  reason?: string;
}

export interface PaymentProviderConfig {
  type: PaymentProviderType;
  isEnabled: boolean;
  isTestMode?: boolean;
  displayName: string;
  description: string;
  instructions?: string;
  supportedCurrencies: string[];
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Payment Provider Interface
 * All payment providers must implement this interface
 */
export interface PaymentProvider {
  readonly type: PaymentProviderType;
  readonly config: PaymentProviderConfig;

  /**
   * Initialize the provider (load config, validate credentials, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Check if the provider is available and properly configured
   */
  isAvailable(): boolean;

  /**
   * Create a new payment
   */
  createPayment(request: CreatePaymentRequest): Promise<PaymentResult>;

  /**
   * Confirm a pending payment (for manual methods like bank transfer)
   */
  confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentResult>;

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Promise<PaymentResult>;

  /**
   * Cancel a pending payment
   */
  cancelPayment(paymentId: string): Promise<PaymentResult>;

  /**
   * Process a refund
   */
  refundPayment(request: RefundRequest): Promise<PaymentResult>;

  /**
   * Get provider-specific payment instructions (for display to user)
   */
  getPaymentInstructions(): PaymentInstructions;
}

export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  accountType: string;
  accountHolder: string;
  rnc?: string;
  swift?: string;
  iban?: string;
}

export interface PaymentInstructions {
  title: string;
  steps: string[];
  bankAccounts?: BankAccountInfo[];
  contactEmail?: string;
  contactPhone?: string;
  notes?: string[];
}

/**
 * Payment Service Events
 */
export type PaymentEventType = 
  | 'payment.created'
  | 'payment.confirmed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refunded';

export interface PaymentEvent {
  type: PaymentEventType;
  paymentId: string;
  provider: PaymentProviderType;
  timestamp: Date;
  data: PaymentResult;
}

export type PaymentEventHandler = (event: PaymentEvent) => void | Promise<void>;
