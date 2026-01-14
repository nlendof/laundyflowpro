import { useState } from 'react';
import { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderStatusFlow } from '@/components/OrderStatusFlow';
import { OrderQRCode } from '@/components/orders/OrderQRCode';
import { PrintTicketButton } from '@/components/orders/PrintTicketButton';
import { WhatsAppNotifyButton } from '@/components/orders/WhatsAppNotifyButton';
import { useOperationsFlow } from '@/hooks/useOperationsFlow';
import {
  Phone,
  MapPin,
  Clock,
  Truck,
  User,
  Package,
  QrCode,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceStatus: (order: Order) => void;
  onRegressStatus?: (order: Order) => void;
  onUpdatePayment?: (orderId: string, paidAmount: number, isPaid: boolean) => Promise<boolean>;
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', icon: Banknote },
  { id: 'card', name: 'Tarjeta', icon: CreditCard },
  { id: 'transfer', name: 'Transferencia', icon: Smartphone },
];

export function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose, 
  onAdvanceStatus,
  onRegressStatus,
  onUpdatePayment,
}: OrderDetailsModalProps) {
  const { getNextStatus, getPreviousStatus, canAdvance: checkCanAdvance, canRegress: checkCanRegress, getStatusConfig } = useOperationsFlow();
  
  const [showQR, setShowQR] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'on_pickup'>('full');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [partialAmount, setPartialAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  if (!order) return null;

  const statusConfig = getStatusConfig(order.status);
  const canAdvance = checkCanAdvance(order.status);
  const canRegress = checkCanRegress(order.status);
  const nextStatus = getNextStatus(order.status);
  const prevStatus = getPreviousStatus(order.status);
  const nextStatusConfig = nextStatus ? getStatusConfig(nextStatus) : null;
  const prevStatusConfig = prevStatus ? getStatusConfig(prevStatus) : null;

  const pendingAmount = order.totalAmount - order.paidAmount;

  const handlePayment = async () => {
    if (!onUpdatePayment) return;

    setIsProcessingPayment(true);
    try {
      let newPaidAmount = order.paidAmount;
      let isPaid = false;

      if (paymentType === 'full') {
        newPaidAmount = order.totalAmount;
        isPaid = true;
      } else if (paymentType === 'partial') {
        const amount = parseFloat(partialAmount);
        if (isNaN(amount) || amount <= 0) {
          toast.error('Ingresa un monto válido');
          return;
        }
        if (amount > pendingAmount) {
          toast.error('El monto no puede ser mayor al pendiente');
          return;
        }
        newPaidAmount = order.paidAmount + amount;
        isPaid = newPaidAmount >= order.totalAmount;
      } else if (paymentType === 'on_pickup') {
        // Just mark as "will pay on pickup" - don't change amounts
        toast.success('El cliente pagará al retirar');
        setShowPaymentForm(false);
        return;
      }

      const success = await onUpdatePayment(order.id, newPaidAmount, isPaid);
      if (success) {
        toast.success(isPaid ? 'Pago completo registrado' : 'Abono registrado');
        setShowPaymentForm(false);
        setPartialAmount('');
      }
    } catch (error) {
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRegress = () => {
    if (onRegressStatus && canRegress) {
      onRegressStatus(order);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-xl">{order.ticketCode}</span>
              <StatusBadge status={order.status} />
            </DialogTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowQR(true)}>
              <QrCode className="w-4 h-4" />
              QR
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Flow */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <h3 className="text-sm font-medium mb-3">Progreso del Pedido</h3>
            <OrderStatusFlow currentStatus={order.status} />
          </div>

          {/* Customer Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Cliente
              </h3>
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <User className="w-4 h-4 text-primary" />
                  {order.customerName}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {order.customerPhone}
                </p>
                {order.customerAddress && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {order.customerAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Entrega
              </h3>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm">
                  <Truck className={cn('w-4 h-4', order.isDelivery ? 'text-primary' : 'text-muted-foreground')} />
                  {order.isDelivery ? 'Entrega a Domicilio' : 'Recoge en Tienda'}
                </p>
                {order.deliverySlot && (
                  <Badge variant="outline">
                    {order.deliverySlot === 'morning' ? '🌅 Mañana (9-13h)' : '🌆 Tarde (14-19h)'}
                  </Badge>
                )}
                {order.estimatedReadyAt && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Listo: {format(order.estimatedReadyAt, "dd MMM, HH:mm", { locale: es })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Artículos ({order.items.length})
            </h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.type === 'weight' ? 'kg' : 'piezas'} × ${item.unitPrice.toFixed(2)}
                      </p>
                      {item.extras.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.extras.map((extra) => (
                            <Badge key={extra} variant="secondary" className="text-xs">
                              + {extra}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
              <div>
                <p className="text-sm text-muted-foreground">Total del Pedido</p>
                <p className="text-3xl font-bold text-primary">
                  ${order.totalAmount.toFixed(2)}
                </p>
                {order.discountAmount && order.discountAmount > 0 && (
                  <p className="text-xs text-green-600">
                    Descuento aplicado: -${order.discountAmount.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-right">
                {order.isPaid ? (
                  <Badge className="bg-green-500 text-white gap-1 px-3 py-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Pagado
                  </Badge>
                ) : (
                  <div className="space-y-1">
                    <Badge variant="destructive" className="gap-1 px-3 py-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Pendiente
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Pagado: ${order.paidAmount.toFixed(2)}
                    </p>
                    <p className="text-sm font-medium text-destructive">
                      Pendiente: ${pendingAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Actions */}
            {!order.isPaid && !showPaymentForm && (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setShowPaymentForm(true)}
              >
                <DollarSign className="w-4 h-4" />
                Registrar Pago
              </Button>
            )}

            {/* Payment Form */}
            {showPaymentForm && !order.isPaid && (
              <div className="p-4 border rounded-xl space-y-4 bg-muted/30">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Registrar Pago
                </h4>

                {/* Payment Type */}
                <div className="space-y-2">
                  <Label>Tipo de Pago</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={paymentType === 'full' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('full')}
                      className="text-xs"
                    >
                      Pago Total
                    </Button>
                    <Button
                      type="button"
                      variant={paymentType === 'partial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('partial')}
                      className="text-xs"
                    >
                      Abono
                    </Button>
                    <Button
                      type="button"
                      variant={paymentType === 'on_pickup' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('on_pickup')}
                      className="text-xs"
                    >
                      Al Retirar
                    </Button>
                  </div>
                </div>

                {/* Partial Amount */}
                {paymentType === 'partial' && (
                  <div className="space-y-2">
                    <Label>Monto del Abono</Label>
                    <Input
                      type="number"
                      placeholder={`Máximo: $${pendingAmount.toFixed(2)}`}
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                    />
                  </div>
                )}

                {/* Payment Method */}
                {paymentType !== 'on_pickup' && (
                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        return (
                          <Button
                            key={method.id}
                            type="button"
                            variant={paymentMethod === method.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPaymentMethod(method.id)}
                            className="gap-1 text-xs"
                          >
                            <Icon className="w-3 h-3" />
                            {method.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPartialAmount('');
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessingPayment}
                    className="flex-1"
                  >
                    {isProcessingPayment ? 'Procesando...' : 'Confirmar Pago'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>📝 Notas:</strong> {order.notes}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Creado: {format(order.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Actualizado: {format(order.updatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
            </span>
            {order.deliveredAt && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
                Entregado: {format(order.deliveredAt, "dd/MM/yyyy HH:mm", { locale: es })}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 pb-2">
            {/* First row: Print and WhatsApp */}
            <div className="flex flex-col sm:flex-row gap-2">
              <PrintTicketButton order={order} variant="outline" className="flex-1" />
              
              {/* WhatsApp Notify Button - Only show when ready_delivery */}
              {order.status === 'ready_delivery' && (
                <WhatsAppNotifyButton 
                  order={order} 
                  notificationType="ready" 
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                />
              )}
            </div>
            
            {/* Second row: Status navigation */}
            <div className="flex gap-2">
              {/* Regress Status Button */}
              {canRegress && prevStatusConfig && onRegressStatus && (
                <Button 
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleRegress}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="truncate">{prevStatusConfig.labelEs}</span>
                </Button>
              )}
              
              {/* Advance Status Button */}
              {canAdvance && nextStatusConfig && (
                <Button 
                  className="flex-1 gap-2"
                  onClick={() => onAdvanceStatus(order)}
                >
                  <span className="truncate">{nextStatusConfig.labelEs}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        <OrderQRCode
          ticketCode={order.ticketCode}
          customerName={order.customerName}
          isOpen={showQR}
          onClose={() => setShowQR(false)}
        />
      </DialogContent>
    </Dialog>
  );
}