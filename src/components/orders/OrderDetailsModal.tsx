import { Order, OrderStatus } from '@/types';
import { ORDER_STATUS_CONFIG, ORDER_STATUS_FLOW } from '@/lib/constants';
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
import { StatusBadge } from '@/components/StatusBadge';
import { OrderStatusFlow } from '@/components/OrderStatusFlow';
import {
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Truck,
  User,
  Package,
  QrCode,
  Printer,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceStatus: (order: Order) => void;
}

export function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose, 
  onAdvanceStatus 
}: OrderDetailsModalProps) {
  if (!order) return null;

  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const currentStatusIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const canAdvance = currentStatusIndex < ORDER_STATUS_FLOW.length - 1;
  const nextStatus = canAdvance ? ORDER_STATUS_FLOW[currentStatusIndex + 1] : null;
  const nextStatusConfig = nextStatus ? ORDER_STATUS_CONFIG[nextStatus] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-xl">{order.ticketCode}</span>
              <StatusBadge status={order.status} />
            </DialogTitle>
            <Button variant="outline" size="sm" className="gap-2">
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

          {/* Payment */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
            <div>
              <p className="text-sm text-muted-foreground">Total del Pedido</p>
              <p className="text-3xl font-bold text-primary">
                ${order.totalAmount.toFixed(2)}
              </p>
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
                </div>
              )}
            </div>
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
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" className="flex-1 gap-2">
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </Button>
            {canAdvance && nextStatusConfig && (
              <Button 
                className="flex-1 gap-2"
                onClick={() => onAdvanceStatus(order)}
              >
                Avanzar a {nextStatusConfig.labelEs}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
