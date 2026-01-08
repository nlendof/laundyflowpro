import { useState, useMemo } from 'react';
import { Order, OrderStatus } from '@/types';
import { MOCK_ORDERS } from '@/lib/mockData';
import { ORDER_STATUS_FLOW } from '@/lib/constants';
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
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Package,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

type SortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showDeliveryOnly, setShowDeliveryOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);

  // Calculate counts
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
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by status
    if (activeStatus !== 'all') {
      result = result.filter(order => order.status === activeStatus);
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
  }, [orders, activeStatus, searchQuery, sortBy, showDeliveryOnly]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleAdvanceStatus = (order: Order) => {
    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
    if (currentIndex < ORDER_STATUS_FLOW.length - 1) {
      const nextStatus = ORDER_STATUS_FLOW[currentIndex + 1] as OrderStatus;
      
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? { ...o, status: nextStatus, updatedAt: new Date() }
            : o
        )
      );

      // Update selected order if modal is open
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => 
          prev ? { ...prev, status: nextStatus, updatedAt: new Date() } : null
        );
      }

      toast.success(`Pedido ${order.ticketCode} avanzado a: ${nextStatus}`);
    }
  };

  const handleCreateOrder = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    setQrOrder(newOrder);
    toast.success(`Pedido ${newOrder.ticketCode} creado exitosamente`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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
          onStatusChange={setActiveStatus}
          counts={statusCounts}
        />
      </div>

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

        <Button variant="outline" size="icon" title="Refrescar">
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
      />

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />

      {/* QR Code Modal */}
      {qrOrder && (
        <OrderQRCode
          ticketCode={qrOrder.ticketCode}
          customerName={qrOrder.customerName}
          isOpen={!!qrOrder}
          onClose={() => setQrOrder(null)}
        />
      )}
    </div>
  );
}
