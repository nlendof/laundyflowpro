import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Clock, Truck, CheckCircle, Home, 
  Shirt, Wind, Sparkles, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerOrdersProps {
  customerId?: string;
}

interface Order {
  id: string;
  ticket_code: string;
  status: string;
  total_amount: number;
  is_paid: boolean;
  created_at: string;
  needs_pickup: boolean;
  needs_delivery: boolean;
  notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  pending_pickup: { 
    label: 'Pendiente Recogida', 
    icon: Clock, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  in_store: { 
    label: 'En Local', 
    icon: Home, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  washing: { 
    label: 'Lavando', 
    icon: Shirt, 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100'
  },
  drying: { 
    label: 'Secando', 
    icon: Wind, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  ironing: { 
    label: 'Planchando', 
    icon: Sparkles, 
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  ready_delivery: { 
    label: 'Listo para Entrega', 
    icon: Package, 
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  in_transit: { 
    label: 'En Camino', 
    icon: Truck, 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  delivered: { 
    label: 'Entregado', 
    icon: CheckCircle, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100'
  },
};

export default function CustomerOrders({ customerId }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (customerId) {
      fetchOrders();
      subscribeToOrders();
    }
  }, [customerId]);

  const fetchOrders = async () => {
    if (!customerId) return;

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setIsLoading(false);
  };

  const subscribeToOrders = () => {
    if (!customerId) return;

    const channel = supabase
      .channel('customer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending_pickup;
  };

  const getProgressPercentage = (status: string) => {
    const statusOrder = [
      'pending_pickup', 'in_store', 'washing', 'drying', 
      'ironing', 'ready_delivery', 'in_transit', 'delivered'
    ];
    const index = statusOrder.indexOf(status);
    return ((index + 1) / statusOrder.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No tienes pedidos</p>
          <p className="text-sm">Solicita una recogida para empezar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mis Pedidos</h2>
      
      <div className="space-y-3">
        {orders.map(order => {
          const config = getStatusConfig(order.status);
          const StatusIcon = config.icon;
          const progress = getProgressPercentage(order.status);

          return (
            <Card 
              key={order.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">
                      {order.ticket_code}
                    </span>
                    {order.needs_pickup && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        Recogida
                      </Badge>
                    )}
                  </div>
                  <Badge 
                    variant={order.is_paid ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {order.is_paid ? 'Pagado' : 'Pendiente'}
                  </Badge>
                </div>

                {/* Status */}
                <div className={`flex items-center gap-2 p-3 rounded-lg ${config.bgColor} mb-3`}>
                  <StatusIcon className={`w-5 h-5 ${config.color}`} />
                  <span className={`font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {format(new Date(order.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                  <span className="font-semibold text-foreground">
                    ${order.total_amount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_pickup;
  const StatusIcon = config.icon;

  const statusOrder = [
    'pending_pickup', 'in_store', 'washing', 'drying', 
    'ironing', 'ready_delivery', 'in_transit', 'delivered'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center sm:items-center">
      <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-auto animate-in slide-in-from-bottom">
        <div className="sticky top-0 bg-background p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">Pedido {order.ticket_code}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Current Status */}
          <div className={`flex items-center gap-3 p-4 rounded-xl ${config.bgColor}`}>
            <StatusIcon className={`w-8 h-8 ${config.color}`} />
            <div>
              <p className={`font-bold ${config.color}`}>{config.label}</p>
              <p className="text-sm text-muted-foreground">Estado actual</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold">Progreso del Pedido</h3>
            <div className="space-y-3">
              {statusOrder.map((status, index) => {
                const statusConfig = STATUS_CONFIG[status];
                const Icon = statusConfig.icon;
                const currentIndex = statusOrder.indexOf(order.status);
                const isComplete = index <= currentIndex;
                const isCurrent = status === order.status;

                return (
                  <div 
                    key={status}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isCurrent ? statusConfig.bgColor : isComplete ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isComplete ? statusConfig.bgColor : 'bg-muted'
                    }`}>
                      <Icon className={`w-4 h-4 ${isComplete ? statusConfig.color : 'text-muted-foreground'}`} />
                    </div>
                    <span className={isComplete ? 'font-medium' : 'text-muted-foreground'}>
                      {statusConfig.label}
                    </span>
                    {isCurrent && (
                      <Badge className="ml-auto">Actual</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Info */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">${order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado de Pago</span>
              <Badge variant={order.is_paid ? 'default' : 'destructive'}>
                {order.is_paid ? 'Pagado' : 'Pendiente'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span>{format(new Date(order.created_at), "d MMM yyyy", { locale: es })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
