import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConfig } from '@/contexts/ConfigContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, Clock, Truck, CheckCircle, Home, 
  Shirt, Wind, Sparkles, MapPin, Store, Waves, Flame
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

// Icon mapping for dynamic operations
const ICON_MAP: Record<string, any> = {
  Clock: Clock,
  Store: Store,
  Home: Home,
  Waves: Waves,
  Wind: Wind,
  Flame: Flame,
  Sparkles: Sparkles,
  Package: Package,
  Truck: Truck,
  CheckCircle: CheckCircle,
  Shirt: Shirt,
  MapPin: MapPin,
};

// Fallback color classes
const getColorClasses = (color: string) => {
  // Convert bg-color-500 to text-color-600 and bg-color-100
  const colorMatch = color.match(/bg-(\w+)-(\d+)/);
  if (colorMatch) {
    const [, colorName] = colorMatch;
    return {
      textColor: `text-${colorName}-600`,
      bgColor: `bg-${colorName}-100`,
    };
  }
  return { textColor: 'text-primary', bgColor: 'bg-primary/10' };
};

export default function CustomerOrders({ customerId }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { activeOperations, loading: configLoading } = useConfig();

  useEffect(() => {
    if (customerId) {
      fetchOrders();
      subscribeToOrders();
    }
  }, [customerId]);

  const fetchOrders = async () => {
    if (!customerId) return;

    // Separate active orders from history (completed + paid for more than 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    // Filter: show orders that are either not delivered, or delivered less than 12 hours ago
    const filteredOrders = (data || []).filter(order => {
      if (order.status !== 'delivered') return true;
      if (!order.is_paid) return true;
      // If delivered and paid, check if it's within 12 hours
      const deliveredAt = order.delivered_at || order.updated_at;
      if (!deliveredAt) return true;
      return new Date(deliveredAt) > new Date(twelveHoursAgo);
    });

    setOrders(filteredOrders);
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

  const getOperationConfig = (status: string) => {
    const operation = activeOperations.find(op => op.key === status);
    if (operation) {
      const IconComponent = ICON_MAP[operation.icon] || Package;
      const colors = getColorClasses(operation.color);
      return {
        label: operation.name,
        icon: IconComponent,
        ...colors,
      };
    }
    // Fallback for unknown status
    return {
      label: status,
      icon: Package,
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-100',
    };
  };

  const getProgressPercentage = (status: string) => {
    const index = activeOperations.findIndex(op => op.key === status);
    if (index === -1) return 0;
    return ((index + 1) / activeOperations.length) * 100;
  };

  if (isLoading || configLoading) {
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
          const config = getOperationConfig(order.status);
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
                  <StatusIcon className={`w-5 h-5 ${config.textColor}`} />
                  <span className={`font-medium ${config.textColor}`}>
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
          activeOperations={activeOperations}
        />
      )}
    </div>
  );
}

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  activeOperations: Array<{
    id: string;
    key: string;
    name: string;
    icon: string;
    color: string;
    isActive: boolean;
    isRequired: boolean;
    order: number;
  }>;
}

function OrderDetailModal({ order, onClose, activeOperations }: OrderDetailModalProps) {
  const currentOperation = activeOperations.find(op => op.key === order.status);
  const IconComponent = currentOperation ? ICON_MAP[currentOperation.icon] || Package : Package;
  const colors = currentOperation ? getColorClasses(currentOperation.color) : { textColor: 'text-gray-600', bgColor: 'bg-gray-100' };

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
          <div className={`flex items-center gap-3 p-4 rounded-xl ${colors.bgColor}`}>
            <IconComponent className={`w-8 h-8 ${colors.textColor}`} />
            <div>
              <p className={`font-bold ${colors.textColor}`}>
                {currentOperation?.name || order.status}
              </p>
              <p className="text-sm text-muted-foreground">Estado actual</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold">Progreso del Pedido</h3>
            <div className="space-y-3">
              {activeOperations.map((operation, index) => {
                const Icon = ICON_MAP[operation.icon] || Package;
                const opColors = getColorClasses(operation.color);
                const currentIndex = activeOperations.findIndex(op => op.key === order.status);
                const isComplete = index <= currentIndex;
                const isCurrent = operation.key === order.status;

                return (
                  <div 
                    key={operation.key}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isCurrent ? opColors.bgColor : isComplete ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isComplete ? opColors.bgColor : 'bg-muted'
                    }`}>
                      <Icon className={`w-4 h-4 ${isComplete ? opColors.textColor : 'text-muted-foreground'}`} />
                    </div>
                    <span className={isComplete ? 'font-medium' : 'text-muted-foreground'}>
                      {operation.name}
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
