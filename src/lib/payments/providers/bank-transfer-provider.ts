import { supabase } from '@/integrations/supabase/client';
import { BasePaymentProvider } from './base-provider';
import type {
  PaymentProviderConfig,
  PaymentProviderType,
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  RefundRequest,
  PaymentResult,
  PaymentInstructions,
  BankAccountInfo,
} from '../types';

/**
 * Bank Transfer Payment Provider
 * Handles manual bank transfer payments with receipt confirmation
 */
export class BankTransferProvider extends BasePaymentProvider {
  readonly type: PaymentProviderType = 'bank_transfer';
  
  readonly config: PaymentProviderConfig = {
    type: 'bank_transfer',
    isEnabled: true,
    displayName: 'Transferencia Bancaria',
    description: 'Pago mediante transferencia o depósito bancario',
    instructions: 'Realiza la transferencia y envía el comprobante para confirmar tu pago.',
    supportedCurrencies: ['DOP', 'USD'],
    minAmount: 100, // 100 DOP minimum
  };

  private bankAccounts: BankAccountInfo[] = [
    {
      bankName: 'Banco Popular Dominicano',
      accountNumber: '123-456789-0',
      accountType: 'Cuenta Corriente',
      accountHolder: 'LaundryFlow Pro SRL',
      rnc: '1-23-45678-9',
    },
    {
      bankName: 'Banreservas',
      accountNumber: '987-654321-0',
      accountType: 'Cuenta de Ahorros',
      accountHolder: 'LaundryFlow Pro SRL',
      rnc: '1-23-45678-9',
    },
  ];

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    const validationError = this.validateAmount(
      request.amount.amount,
      request.amount.currency
    );

    if (validationError) {
      return {
        success: false,
        status: 'failed',
        error: validationError,
      };
    }

    try {
      const paymentReference = this.generatePaymentReference();

      // Create payment record in database
      const { data, error } = await supabase
        .from('subscription_payments')
        .insert({
          subscription_id: request.metadata?.subscriptionId,
          branch_id: request.metadata?.branchId,
          amount: request.amount.amount,
          currency: request.amount.currency,
          payment_method: 'bank_transfer',
          status: 'pending',
          period_start: request.metadata?.periodStart,
          period_end: request.metadata?.periodEnd,
          invoice_number: paymentReference,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating payment:', error);
        return {
          success: false,
          status: 'failed',
          error: 'No se pudo crear el registro de pago',
        };
      }

      return {
        success: true,
        paymentId: data.id,
        status: 'pending',
        providerReference: paymentReference,
        requiresAction: true,
        actionType: 'upload_receipt',
        actionData: {
          bankAccounts: this.bankAccounts,
          reference: paymentReference,
          amount: request.amount.amount,
          currency: request.amount.currency,
        },
      };
    } catch (error) {
      console.error('Error in createPayment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Error al procesar el pago',
      };
    }
  }

  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentResult> {
    try {
      // Update payment status to processing (pending admin confirmation)
      const { data, error } = await supabase
        .from('subscription_payments')
        .update({
          status: 'processing',
          // Store receipt info in notes or separate field if needed
        })
        .eq('id', request.paymentId)
        .select()
        .single();

      if (error) {
        console.error('Error confirming payment:', error);
        return {
          success: false,
          status: 'failed',
          error: 'No se pudo confirmar el pago',
        };
      }

      return {
        success: true,
        paymentId: data.id,
        status: 'processing',
      };
    } catch (error) {
      console.error('Error in confirmPayment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Error al confirmar el pago',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !data) {
        return {
          success: false,
          status: 'failed',
          error: 'Pago no encontrado',
        };
      }

      return {
        success: true,
        paymentId: data.id,
        status: data.status as any,
        providerReference: data.invoice_number || undefined,
      };
    } catch (error) {
      console.error('Error in getPaymentStatus:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Error al obtener estado del pago',
      };
    }
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId)
        .eq('status', 'pending') // Only cancel pending payments
        .select()
        .single();

      if (error) {
        return {
          success: false,
          status: 'failed',
          error: 'No se pudo cancelar el pago',
        };
      }

      return {
        success: true,
        paymentId: data.id,
        status: 'cancelled',
      };
    } catch (error) {
      console.error('Error in cancelPayment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Error al cancelar el pago',
      };
    }
  }

  async refundPayment(request: RefundRequest): Promise<PaymentResult> {
    // Bank transfers require manual refund processing
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .update({ status: 'refunded' })
        .eq('id', request.paymentId)
        .eq('status', 'completed')
        .select()
        .single();

      if (error) {
        return {
          success: false,
          status: 'failed',
          error: 'No se pudo procesar el reembolso',
        };
      }

      return {
        success: true,
        paymentId: data.id,
        status: 'refunded',
      };
    } catch (error) {
      console.error('Error in refundPayment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Error al procesar reembolso',
      };
    }
  }

  getPaymentInstructions(): PaymentInstructions {
    return {
      title: 'Instrucciones de Pago por Transferencia',
      steps: [
        'Selecciona una de las cuentas bancarias disponibles',
        'Realiza la transferencia o depósito por el monto indicado',
        'Incluye tu número de referencia en la descripción de la transferencia',
        'Toma una foto o captura del comprobante de pago',
        'Envía el comprobante al correo indicado o súbelo en el sistema',
        'Tu pago será verificado en un plazo de 24-48 horas hábiles',
      ],
      bankAccounts: this.bankAccounts,
      contactEmail: 'pagos@laundryflow.com',
      contactPhone: '+1 809 555 1234',
      notes: [
        'Los pagos se procesan en días hábiles de 9:00 AM a 5:00 PM',
        'Guarda tu comprobante hasta que el pago sea confirmado',
        'Para montos mayores a $5,000 USD, contacta a soporte',
      ],
    };
  }

  /**
   * Get available bank accounts for display
   */
  getBankAccounts(): BankAccountInfo[] {
    return this.bankAccounts;
  }

  /**
   * Admin method to approve a pending payment
   */
  async approvePayment(paymentId: string, adminNotes?: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .update({ 
          status: 'completed',
          // Could add admin_notes field if needed
        })
        .eq('id', paymentId)
        .in('status', ['pending', 'processing'])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          status: 'failed',
          error: 'No se pudo aprobar el pago',
        };
      }

      // Update subscription status if payment is approved
      if (data.subscription_id) {
        await supabase
          .from('branch_subscriptions')
          .update({
            status: 'active',
            last_payment_at: new Date().toISOString(),
            past_due_since: null,
            current_period_start: data.period_start,
            current_period_end: data.period_end,
          })
          .eq('id', data.subscription_id);
      }

      return {
        success: true,
        paymentId: data.id,
        status: 'completed',
      };
    } catch (error) {
      console.error('Error in approvePayment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Error al aprobar el pago',
      };
    }
  }
}
