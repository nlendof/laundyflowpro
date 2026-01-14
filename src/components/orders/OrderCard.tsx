import { Order } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useOperationsFlow } from '@/hooks/useOperationsFlow';
import {
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Truck,
  Eye,
  ChevronRight,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  isNew?: boolean;
}

export function OrderCard({ order, onViewDetails, isNew = false }: OrderCardProps) {
  const { getStatusConfig } = useOperationsFlow();
  const statusConfig = getStatusConfig(order.status);
  const borderColor = statusConfig?.color?.replace('text-', 'border-l-') || 'border-l-muted';

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30',
        'border-l-4',
        borderColor,
        isNew && 'ring-2 ring-primary ring-offset-2 animate-pulse bg-primary/5'
      )}
      onClick={() => onViewDetails(order)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono font-bold text-lg text-primary">
                {order.ticketCode}
              </span>
              <StatusBadge status={order.status} size="sm" />
              {order.isDelivery && (
                <Badge variant="outline" className="gap-1">
                  <Truck className="w-3 h-3" />
                  Delivery
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-foreground truncate">
                {order.customerName}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {order.customerPhone}
                </span>
                {order.customerAddress && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5" />
                    {order.customerAddress}
                  </span>
                )}
              </div>
            </div>

            {/* Items Summary */}
            <div className="mt-3 flex flex-wrap gap-2">
              {order.items.slice(0, 3).map((item) => (
                <Badge key={item.id} variant="secondary" className="text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  {item.quantity} {item.type === 'weight' ? 'kg' : 'pz'} - {item.name}
                </Badge>
              ))}
              {order.items.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{order.items.length - 3} más
                </Badge>
              )}
            </div>
          </div>

          {/* Right Side Info */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:text-right">
            <div>
              <p className="text-2xl font-bold text-primary">
                ${order.totalAmount.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 text-sm">
                {order.isPaid ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    Pagado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <DollarSign className="w-3 h-3" />
                    Pendiente ${(order.totalAmount - order.paidAmount).toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {format(order.createdAt, "dd MMM, HH:mm", { locale: es })}
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="group-hover:bg-primary group-hover:text-primary-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(order);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Nota:</strong> {order.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
