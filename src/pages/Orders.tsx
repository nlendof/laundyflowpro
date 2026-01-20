import { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus } from '@/types';
import { OrderStatusTabs } from '@/components/orders/OrderStatusTabs';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { NewOrderModal } from '@/components/orders/NewOrderModal';
import { OrderQRCode } from '@/components/orders/OrderQRCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Package,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  DollarSign,
  Banknote,
  CreditCard,
  Smartphone,
  CalendarIcon,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrders } from '@/hooks/useOrders';
import { useNewOrders } from '@/contexts/NewOrdersContext';
import { useOperationsFlow } from '@/hooks/useOperationsFlow';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', icon: Banknote },
  { id: 'card', name: 'Tarjeta', icon: CreditCard },
  { id: 'transfer', name: 'Transferencia', icon: Smartphone },
];

type SortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

export default function Orders() {
  const { incrementCount, clearCount } = useNewOrders();
  const { orders, loading, newOrderIds, fetchOrders, createOrder, updateOrderStatus, updateOrderPayment } = useOrders({
    onNewOrder: incrementCount
  });
  const { statusFlow, getStatusConfig, getNextStatus, getPreviousStatus } = useOperationsFlow();
  // Default to ready_delivery
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'all'>('ready_delivery');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showDeliveryOnly, setShowDeliveryOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  
  // History date picker for delivered orders
  const [historyDate, setHistoryDate] = useState<Date | undefined>(undefined);
  
  // Payment dialog state for delivery
  const [paymentWarningOpen, setPaymentWarningOpen] = useState(false);
  const [orderNeedingPayment, setOrderNeedingPayment] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Clear badge when on orders page
  useEffect(() => {
    clearCount();
  }, [clearCount]);

  // Calculate counts - only count today's delivered orders
  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      pending_pickup: 0,
      in_store: 0,
      washing: 0,
      drying: 0,
      ironing: 0,
      ready_delivery: 0,
      in_transit: 0,
      delivered: 0,
    };
    orders.forEach(order => {
      // For delivered orders, only count if delivered today
      if (order.status === 'delivered') {
        const deliveredAt = order.deliveredAt || order.updatedAt;
        if (isToday(deliveredAt)) {
          counts.delivered += 1;
        }
      } else {
        counts[order.status] = (counts[order.status] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // For "all" status, exclude delivered orders that are not from today (history)
    if (activeStatus === 'all') {
      result = result.filter(order => {
        if (order.status === 'delivered') {
          const deliveredAt = order.deliveredAt || order.updatedAt;
          return isToday(deliveredAt);
        }
        return true;
      });
    } else {
      // Filter by specific status
      result = result.filter(order => order.status === activeStatus);
      
      // Special handling for delivered: show only today's or selected history date
      if (activeStatus === 'delivered') {
        if (historyDate) {
          // Show orders from selected history date
          const dayStart = startOfDay(historyDate);
          const dayEnd = endOfDay(historyDate);
          result = result.filter(order => {
            const deliveredAt = order.deliveredAt || order.updatedAt;
            return deliveredAt >= dayStart && deliveredAt <= dayEnd;
          });
        } else {
          // Show only today's delivered orders
          result = result.filter(order => {
            const deliveredAt = order.deliveredAt || order.updatedAt;
            return isToday(deliveredAt);
          });
        }
      }
    }

    // Filter by delivery
    if (showDeliveryOnly) {
      result = result.filter(order => order.isDelivery);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        order =>
          order.ticketCode.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.customerPhone.includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'amount_high':
          return b.totalAmount - a.totalAmount;
        case 'amount_low':
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });

    return result;
  }, [orders, activeStatus, searchQuery, sortBy, showDeliveryOnly, historyDate]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleAdvanceStatus = async (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    if (nextStatus) {
      const success = await updateOrderStatus(order.id, nextStatus);
      
      if (success) {
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(prev => 
            prev ? { ...prev, status: nextStatus, updatedAt: new Date() } : null
          );
        }
        const config = getStatusConfig(nextStatus);
        toast.success(`Pedido ${order.ticketCode} avanzado a: ${config?.labelEs || nextStatus}`);
      }
    }
  };

  const handlePaymentRequiredForDelivery = (order: Order) => {
    setOrderNeedingPayment(order);
    setPaymentWarningOpen(true);
  };

  const handleProcessPaymentAndDeliver = async () => {
    if (!orderNeedingPayment) return;
    
    setIsProcessingPayment(true);
    try {
      const remainingAmount = orderNeedingPayment.totalAmount - (orderNeedingPayment.paidAmount || 0);
      
      // Update order as paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          is_paid: true,
          paid_amount: orderNeedingPayment.totalAmount,
        })
        .eq('id', orderNeedingPayment.id);
      
      if (updateError) throw updateError;
      
      // Register income in cash register
      const { error: cashError } = await supabase
        .from('cash_register')
        .insert({
          amount: remainingAmount,
          category: 'venta',
          entry_type: 'income',
          description: `Pago completo de pedido ${orderNeedingPayment.ticketCode} (${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}) al entregar`,
          order_id: orderNeedingPayment.id,
        });
      
      if (cashError) throw cashError;
      
      // Now complete delivery
      const success = await updateOrderStatus(orderNeedingPayment.id, 'delivered');
      
      if (success) {
        toast.success(`${orderNeedingPayment.ticketCode} → Entregado`, {
          description: 'Pago procesado y pedido entregado correctamente',
        });
      }
      
      setPaymentWarningOpen(false);
      setOrderNeedingPayment(null);
      setPaymentMethod('cash');
      setIsModalOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRegressStatus = async (order: Order) => {
    const prevStatus = getPreviousStatus(order.status);
    if (prevStatus) {
      const success = await updateOrderStatus(order.id, prevStatus);
      
      if (success) {
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(prev => 
            prev ? { ...prev, status: prevStatus, updatedAt: new Date() } : null
          );
        }
        const config = getStatusConfig(prevStatus);
        toast.success(`Pedido ${order.ticketCode} retrocedido a: ${config?.labelEs || prevStatus}`);
      }
    }
  };

  const handleUpdatePayment = async (orderId: string, paidAmount: number, isPaid: boolean) => {
    const success = await updateOrderPayment(orderId, paidAmount, isPaid);
    if (success && selectedOrder?.id === orderId) {
      setSelectedOrder(prev => 
        prev ? { ...prev, paidAmount, isPaid, updatedAt: new Date() } : null
      );
    }
    return success;
  };

  const handleCreateOrder = async (newOrder: Order) => {
    try {
      const created = await createOrder(newOrder);
      if (created) {
        setQrOrder(created);
        toast.success(`Pedido ${created.ticketCode} creado exitosamente`);
      }
    } catch {
      // Error handled in hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los pedidos de la lavandería
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsNewOrderModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="overflow-x-auto -mx-6 px-6 lg:-mx-8 lg:px-8 pb-2">
        <OrderStatusTabs
          activeStatus={activeStatus}
          onStatusChange={(status) => {
            setActiveStatus(status);
            // Clear history date when switching away from delivered
            if (status !== 'delivered') {
              setHistoryDate(undefined);
            }
          }}
          counts={statusCounts}
        />
      </div>

      {/* History Date Picker for Delivered */}
      {activeStatus === 'delivered' && (
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border">
          <History className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {historyDate ? 'Historial del' : 'Mostrando entregas de hoy'}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2",
                  historyDate && "text-primary border-primary"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {historyDate ? format(historyDate, "PPP", { locale: es }) : "Ver historial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={historyDate}
                onSelect={setHistoryDate}
                disabled={(date) => date > new Date()}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {historyDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryDate(undefined)}
              className="text-muted-foreground"
            >
              Ver solo hoy
            </Button>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Más recientes</SelectItem>
            <SelectItem value="oldest">Más antiguos</SelectItem>
            <SelectItem value="amount_high">Mayor monto</SelectItem>
            <SelectItem value="amount_low">Menor monto</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showDeliveryOnly ? 'default' : 'outline'}
          onClick={() => setShowDeliveryOnly(!showDeliveryOnly)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Solo Delivery
        </Button>

        <Button variant="outline" size="icon" title="Refrescar" onClick={() => fetchOrders()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={handleViewDetails}
              isNew={newOrderIds.has(order.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No hay pedidos</h3>
            <p className="text-muted-foreground max-w-sm">
              {searchQuery
                ? 'No se encontraron pedidos con esos criterios de búsqueda.'
                : 'No hay pedidos en este estado. Los nuevos pedidos aparecerán aquí.'}
            </p>
          </div>
        )}
      </div>

      {/* Results Count */}
      {filteredOrders.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {filteredOrders.length} de {orders.length} pedidos
        </p>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdvanceStatus={handleAdvanceStatus}
        onRegressStatus={handleRegressStatus}
        onUpdatePayment={handleUpdatePayment}
        onPaymentRequiredForDelivery={handlePaymentRequiredForDelivery}
      />

      {/* Payment Warning Dialog with Payment Options */}
      <Dialog open={paymentWarningOpen} onOpenChange={(open) => {
        if (!open) {
          setPaymentWarningOpen(false);
          setOrderNeedingPayment(null);
          setPaymentMethod('cash');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Pago Pendiente
            </DialogTitle>
            <DialogDescription>
              Este pedido tiene un saldo pendiente. Complete el pago para poder entregar.
            </DialogDescription>
          </DialogHeader>

          {orderNeedingPayment && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 bg-muted/50 rounded-xl border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pedido</span>
                  <span className="font-mono font-bold">{orderNeedingPayment.ticketCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cliente</span>
                  <span className="font-medium">{orderNeedingPayment.customerName}</span>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total del pedido</span>
                    <span className="font-medium">{formatCurrency(orderNeedingPayment.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-sm">Pagado</span>
                    <span className="font-medium">{formatCurrency(orderNeedingPayment.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-destructive">
                    <span>A Cobrar</span>
                    <span>{formatCurrency(orderNeedingPayment.totalAmount - (orderNeedingPayment.paidAmount || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Método de Pago</Label>
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
                        className="gap-1.5"
                      >
                        <Icon className="w-4 h-4" />
                        {method.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentWarningOpen(false);
                    setOrderNeedingPayment(null);
                    setPaymentMethod('cash');
                  }}
                  className="flex-1"
                  disabled={isProcessingPayment}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcessPaymentAndDeliver}
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Cobrar y Entregar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />

      {/* QR Code Modal */}
      {qrOrder && (
        <OrderQRCode
          order={qrOrder}
          isOpen={!!qrOrder}
          onClose={() => setQrOrder(null)}
        />
      )}
    </div>
  );
}
