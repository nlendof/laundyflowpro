import { useState, useMemo } from 'react';
import { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Store,
  Waves,
  Wind,
  Flame,
  Package,
  Search,
  Clock,
  ArrowRight,
  CheckCircle,
  User,
  Phone,
  AlertCircle,
  Timer,
  Play,
  Pause,
  Truck,
  Zap,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useConfig } from '@/contexts/ConfigContext';
import { useOrders } from '@/hooks/useOrders';
import { useOperationsFlow } from '@/hooks/useOperationsFlow';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Clock,
  Store,
  Waves,
  Wind,
  Flame,
  Package,
  Truck,
  CheckCircle,
  Zap,
};

interface OperationOrderCardProps {
  order: Order;
  onAdvance: (order: Order) => void;
  onViewDetails: (order: Order) => void;
}

function OperationOrderCard({ order, onAdvance, onViewDetails, onMarkDelivered }: OperationOrderCardProps & { onMarkDelivered: (order: Order) => void }) {
  const { statusFlow, getStatusConfig, getNextStatus } = useOperationsFlow();
  const readyDeliveryIndex = statusFlow.indexOf('ready_delivery');
  const currentIndex = statusFlow.indexOf(order.status);
  const canAdvance = currentIndex >= 0 && currentIndex < readyDeliveryIndex;
  const nextStatus = getNextStatus(order.status);
  const nextStatusConfig = nextStatus ? getStatusConfig(nextStatus) : null;

  const timeInStatus = formatDistanceToNow(order.updatedAt, { locale: es, addSuffix: false });

  // Check if order can be marked as delivered (ready_delivery + no delivery service needed)
  const canMarkDelivered = order.status === 'ready_delivery' && !order.needsDelivery;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
        order.isDelivery && 'border-l-4 border-l-blue-500'
      )}
      onClick={() => onViewDetails(order)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm">{order.ticketCode}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="w-3 h-3" />
            {timeInStatus}
          </div>
        </div>

        {/* Customer */}
        <div className="space-y-1">
          <p className="font-medium text-sm flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            {order.customerName}
          </p>
          <div className="flex gap-1">
            {order.needsDelivery && (
              <Badge variant="outline" className="text-xs">
                🚚 Delivery
              </Badge>
            )}
            {!order.needsDelivery && order.status === 'ready_delivery' && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                🏪 Retiro en local
              </Badge>
            )}
          </div>
        </div>

        {/* Items summary */}
        <div className="text-xs text-muted-foreground">
          {order.items.length} artículo{order.items.length > 1 ? 's' : ''} • 
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} piezas
        </div>

        {/* Notes warning */}
        {order.notes && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span className="truncate">{order.notes}</span>
          </div>
        )}

        {/* Action button - Advance to next status */}
        {canAdvance && nextStatusConfig && (
          <Button
            size="sm"
            className="w-full gap-2 mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(order);
            }}
          >
            <Play className="w-3.5 h-3.5" />
            Pasar a {nextStatusConfig.labelEs}
          </Button>
        )}

        {/* Ready for pickup in store - show delivered button */}
        {canMarkDelivered && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-center gap-2 p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Listo para entregar</span>
            </div>
            <Button
              size="sm"
              variant="default"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                onMarkDelivered(order);
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Marcar como Entregado
            </Button>
          </div>
        )}

        {/* Ready for delivery - waiting for driver */}
        {order.status === 'ready_delivery' && order.needsDelivery && (
          <div className="flex items-center justify-center gap-2 p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-medium">Esperando repartidor</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvance: (order: Order) => void;
  onMarkDelivered: (order: Order) => void;
}

function OrderDetailsDialog({ order, isOpen, onClose, onAdvance, onMarkDelivered }: OrderDetailsDialogProps) {
  const { statusFlow, getStatusConfig, getNextStatus } = useOperationsFlow();
  
  if (!order) return null;

  const readyDeliveryIndex = statusFlow.indexOf('ready_delivery');
  const currentIndex = statusFlow.indexOf(order.status);
  const canAdvance = currentIndex >= 0 && currentIndex < readyDeliveryIndex;
  const nextStatus = getNextStatus(order.status);
  const nextStatusConfig = nextStatus ? getStatusConfig(nextStatus) : null;
  
  // Check if order can be marked as delivered (ready_delivery + no delivery service needed)
  const canMarkDelivered = order.status === 'ready_delivery' && !order.needsDelivery;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{order.ticketCode}</span>
            <StatusBadge status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {order.customerName}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {order.customerPhone}
            </p>
            <div className="flex gap-2">
              {order.needsDelivery && (
                <Badge>🚚 Entrega a Domicilio</Badge>
              )}
              {!order.needsDelivery && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  🏪 Retiro en local
                </Badge>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Artículos</h4>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between p-2 bg-muted/30 rounded-lg text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">
                    {item.quantity} {item.type === 'weight' ? 'kg' : 'pz'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Extras */}
          {order.items.some(item => item.extras.length > 0) && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Servicios Extra</h4>
              <div className="flex flex-wrap gap-1">
                {order.items.flatMap(item => item.extras).map((extra, idx) => (
                  <Badge key={idx} variant="secondary">{extra}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>📝 Notas:</strong> {order.notes}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Recibido: {format(order.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Última actualización: {format(order.updatedAt, "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </div>

          {/* Actions */}
          {canAdvance && nextStatusConfig && (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => {
                onAdvance(order);
                onClose();
              }}
            >
              <ArrowRight className="w-4 h-4" />
              Avanzar a {nextStatusConfig.labelEs}
            </Button>
          )}

          {/* Ready for pickup in store - show delivered button */}
          {canMarkDelivered && (
            <div className="space-y-3">
              <div className="p-4 bg-green-500/10 rounded-xl text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-600 dark:text-green-400">
                  Listo para entregar al cliente
                </p>
              </div>
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                size="lg"
                onClick={() => {
                  onMarkDelivered(order);
                  onClose();
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Marcar como Entregado
              </Button>
            </div>
          )}

          {/* Ready for delivery - waiting for driver */}
          {order.status === 'ready_delivery' && order.needsDelivery && (
            <div className="p-4 bg-blue-500/10 rounded-xl text-center">
              <Truck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-blue-600 dark:text-blue-400">
                Esperando asignación de repartidor
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Operations() {
  const { activeOperations, getOperationByKey } = useConfig();
  const { orders, loading, fetchOrders, updateOrderStatus } = useOrders();
  const { statusFlow, getStatusConfig, getNextStatus } = useOperationsFlow();
  
  // Filter operation statuses that are active and between in_store and ready_delivery
  const operationKeys = useMemo(() => {
    const relevantKeys = ['in_store', 'washing', 'drying', 'ironing', 'ready_delivery'];
    return activeOperations
      .filter(op => relevantKeys.includes(op.key))
      .map(op => op.key as OrderStatus);
  }, [activeOperations]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filter orders for operations (only relevant statuses)
  const operationOrders = useMemo(() => {
    return orders.filter(order => operationKeys.includes(order.status));
  }, [orders, operationKeys]);

  // Group by status
  const ordersByStatus = useMemo(() => {
    const groups: Record<OrderStatus, Order[]> = {
      pending_pickup: [],
      in_store: [],
      washing: [],
      drying: [],
      ironing: [],
      ready_delivery: [],
      in_transit: [],
      delivered: [],
    };

    operationOrders.forEach(order => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          order.ticketCode.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query);
        if (!matches) return;
      }
      groups[order.status].push(order);
    });

    return groups;
  }, [operationOrders, searchQuery]);

  // Count totals
  const totalPending = ordersByStatus.in_store.length;
  const totalInProcess = ordersByStatus.washing.length + ordersByStatus.drying.length + ordersByStatus.ironing.length;
  const totalReady = ordersByStatus.ready_delivery.length;

  const handleAdvanceStatus = async (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    if (nextStatus) {
      const success = await updateOrderStatus(order.id, nextStatus);
      
      if (success) {
        const config = getStatusConfig(nextStatus);
        toast.success(`${order.ticketCode} → ${config?.labelEs || nextStatus}`);
      }
    }
  };

  const handleMarkDelivered = async (order: Order) => {
    const success = await updateOrderStatus(order.id, 'delivered');
    
    if (success) {
      toast.success(`${order.ticketCode} → Entregado`, {
        description: 'El pedido ha sido entregado al cliente en el local',
      });
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Waves className="w-8 h-8 text-primary" />
            Operaciones
          </h1>
          <p className="text-muted-foreground">Gestión del proceso de lavado</p>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <p className="text-xs text-amber-600 dark:text-amber-400">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalPending}</p>
          </div>
          <div className="px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">En Proceso</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalInProcess}</p>
          </div>
          <div className="px-4 py-2 bg-green-500/10 rounded-xl border border-green-500/20">
            <p className="text-xs text-green-600 dark:text-green-400">Listos</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalReady}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchOrders()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código o cliente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max h-full pb-4">
          {operationKeys.map((status) => {
            const config = getStatusConfig(status);
            const operation = getOperationByKey(status);
            const Icon = operation ? (ICON_MAP[operation.icon] || Package) : Package;
            const statusOrders = ordersByStatus[status];

            return (
              <div
                key={status}
                className="w-[300px] flex flex-col bg-muted/30 rounded-2xl border"
              >
                {/* Column Header */}
                <div className={cn(
                  'p-4 rounded-t-2xl flex items-center justify-between',
                  operation?.color || config.bgColor
                )}>
                  <div className="flex items-center gap-2 text-white">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">
                      {operation?.name || config.labelEs}
                    </span>
                  </div>
                  <Badge variant="secondary" className="h-6 min-w-6">
                    {statusOrders.length}
                  </Badge>
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {statusOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                      <Icon className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">Sin pedidos</p>
                    </div>
                  ) : (
                    statusOrders.map((order) => (
                      <OperationOrderCard
                        key={order.id}
                        order={order}
                        onAdvance={handleAdvanceStatus}
                        onViewDetails={handleViewDetails}
                        onMarkDelivered={handleMarkDelivered}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onAdvance={handleAdvanceStatus}
        onMarkDelivered={handleMarkDelivered}
      />
    </div>
  );
}
