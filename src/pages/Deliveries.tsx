import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  Search,
  MapPin,
  Clock,
  Phone,
  Package,
  CheckCircle,
  Navigation,
  User,
  Calendar,
  ArrowRight,
  Play,
  Ban,
  DollarSign,
  Sunrise,
  Sunset,
  Route,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MOCK_ORDERS } from '@/lib/mockData';
import { Order } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Mock drivers data
const MOCK_DRIVERS = [
  { 
    id: '1', 
    name: 'Carlos Mendoza', 
    phone: '+52 55 1111 2222', 
    avatar: '🚗',
    status: 'available' as const,
    currentOrders: 0,
    completedToday: 3,
    zone: 'Norte'
  },
  { 
    id: '2', 
    name: 'Miguel Ángel', 
    phone: '+52 55 3333 4444', 
    avatar: '🏍️',
    status: 'delivering' as const,
    currentOrders: 2,
    completedToday: 5,
    zone: 'Centro'
  },
  { 
    id: '3', 
    name: 'José Luis', 
    phone: '+52 55 5555 6666', 
    avatar: '🛵',
    status: 'available' as const,
    currentOrders: 0,
    completedToday: 4,
    zone: 'Sur'
  },
  { 
    id: '4', 
    name: 'Repartidor Demo', 
    phone: '+52 55 7777 8888', 
    avatar: '🚚',
    status: 'delivering' as const,
    currentOrders: 1,
    completedToday: 2,
    zone: 'Oriente'
  },
];

type Driver = typeof MOCK_DRIVERS[0];
type DeliveryFilter = 'all' | 'pending_pickup' | 'ready_delivery' | 'in_transit' | 'delivered';

export default function Deliveries() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [drivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DeliveryFilter>('all');
  const [selectedSlot, setSelectedSlot] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);

  // Filter only delivery orders
  const deliveryOrders = useMemo(() => {
    return orders.filter(order => {
      // Only delivery orders
      if (!order.isDelivery) return false;
      
      // Status filter
      const deliveryStatuses = ['pending_pickup', 'ready_delivery', 'in_transit', 'delivered'];
      if (activeTab !== 'all' && order.status !== activeTab) return false;
      if (activeTab === 'all' && !deliveryStatuses.includes(order.status)) return false;
      
      // Slot filter
      if (selectedSlot !== 'all' && order.deliverySlot !== selectedSlot) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.ticketCode.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.customerPhone.includes(query) ||
          order.customerAddress?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [orders, activeTab, selectedSlot, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const deliveryOnly = orders.filter(o => o.isDelivery);
    return {
      pendingPickup: deliveryOnly.filter(o => o.status === 'pending_pickup').length,
      readyDelivery: deliveryOnly.filter(o => o.status === 'ready_delivery').length,
      inTransit: deliveryOnly.filter(o => o.status === 'in_transit').length,
      deliveredToday: deliveryOnly.filter(o => 
        o.status === 'delivered' && 
        o.deliveredAt && 
        new Date(o.deliveredAt).toDateString() === new Date().toDateString()
      ).length,
      availableDrivers: drivers.filter(d => d.status === 'available').length,
    };
  }, [orders, drivers]);

  const handleAssignDriver = (order: Order) => {
    setOrderToAssign(order);
    setShowAssignDialog(true);
  };

  const confirmAssignDriver = (driverId: string) => {
    if (!orderToAssign) return;
    
    const driver = drivers.find(d => d.id === driverId);
    setOrders(prev => prev.map(o => {
      if (o.id === orderToAssign.id) {
        return {
          ...o,
          deliveryDriverId: driverId,
          status: 'in_transit' as const,
          updatedAt: new Date(),
        };
      }
      return o;
    }));
    
    toast.success(`Pedido asignado a ${driver?.name}`);
    setShowAssignDialog(false);
    setOrderToAssign(null);
  };

  const handleStartPickup = (order: Order) => {
    setOrders(prev => prev.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'in_store' as const,
          updatedAt: new Date(),
        };
      }
      return o;
    }));
    toast.success('Recogida iniciada');
  };

  const handleMarkDelivered = (order: Order) => {
    setOrders(prev => prev.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'delivered' as const,
          deliveredAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return o;
    }));
    toast.success('¡Entrega completada!');
    setSelectedOrder(null);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: typeof Truck }> = {
      pending_pickup: { label: 'Pendiente Recogida', color: 'bg-amber-500', icon: Clock },
      ready_delivery: { label: 'Listo para Entregar', color: 'bg-emerald-500', icon: Package },
      in_transit: { label: 'En Camino', color: 'bg-blue-500', icon: Truck },
      delivered: { label: 'Entregado', color: 'bg-green-600', icon: CheckCircle },
    };
    return configs[status] || configs.pending_pickup;
  };

  const getDriverById = (driverId?: string) => {
    return drivers.find(d => d.id === driverId);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            Entregas
          </h1>
          <p className="text-muted-foreground">Gestiona recogidas y entregas a domicilio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedSlot} onValueChange={(v) => setSelectedSlot(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="morning">🌅 Mañana</SelectItem>
              <SelectItem value="afternoon">🌆 Tarde</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pendingPickup}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Por Recoger</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.readyDelivery}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Por Entregar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.inTransit}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500">En Camino</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.deliveredToday}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Entregados Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg text-white">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.availableDrivers}</p>
                <p className="text-xs text-purple-600 dark:text-purple-500">Repartidores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeliveryFilter)}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                  <TabsTrigger value="pending_pickup" className="text-xs">Recogida</TabsTrigger>
                  <TabsTrigger value="ready_delivery" className="text-xs">Listos</TabsTrigger>
                  <TabsTrigger value="in_transit" className="text-xs">En Camino</TabsTrigger>
                  <TabsTrigger value="delivered" className="text-xs">Entregados</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay entregas en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    const driver = getDriverById(order.deliveryDriverId);
                    
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/50',
                          selectedOrder?.id === order.id && 'border-primary bg-primary/5'
                        )}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn('p-2 rounded-lg text-white', statusConfig.color)}>
                              <StatusIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">{order.ticketCode}</span>
                                <Badge variant="outline" className="text-xs">
                                  {order.deliverySlot === 'morning' ? '🌅 Mañana' : '🌆 Tarde'}
                                </Badge>
                              </div>
                              <p className="font-medium mt-1">{order.customerName}</p>
                              {order.customerAddress && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {order.customerAddress}
                                </p>
                              )}
                              {driver && (
                                <p className="text-sm text-primary flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" />
                                  {driver.avatar} {driver.name}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <Badge className={cn('text-white', statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                            {!order.isPaid && (
                              <Badge variant="destructive" className="mt-2 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(order.updatedAt, { locale: es, addSuffix: true })}
                          </span>
                          
                          <div className="flex gap-2">
                            {order.status === 'pending_pickup' && (
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleStartPickup(order); }}
                                className="gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Iniciar Recogida
                              </Button>
                            )}
                            {order.status === 'ready_delivery' && (
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleAssignDriver(order); }}
                                className="gap-1"
                              >
                                <Truck className="w-3 h-3" />
                                Asignar Repartidor
                              </Button>
                            )}
                            {order.status === 'in_transit' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={(e) => { e.stopPropagation(); handleMarkDelivered(order); }}
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Marcar Entregado
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drivers Panel */}
        <div className="space-y-6">
          {/* Drivers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Repartidores
              </CardTitle>
              <CardDescription>Estado actual de los repartidores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all',
                    driver.status === 'available' 
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{driver.avatar}</span>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Zona {driver.zone}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={driver.status === 'available' ? 'default' : 'secondary'}
                      className={driver.status === 'available' ? 'bg-green-600' : 'bg-blue-500 text-white'}
                    >
                      {driver.status === 'available' ? 'Disponible' : 'En ruta'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-dashed">
                    <span className="text-xs text-muted-foreground">
                      🚚 {driver.currentOrders} activos
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ✅ {driver.completedToday} hoy
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order Details */}
          {selectedOrder && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="w-5 h-5" />
                  Detalle del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket</p>
                  <p className="font-mono font-bold text-lg">{selectedOrder.ticketCode}</p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <a 
                      href={`tel:${selectedOrder.customerPhone}`} 
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedOrder.customerPhone}
                    </a>
                  </div>
                </div>
                
                {selectedOrder.customerAddress && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="font-medium flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        {selectedOrder.customerAddress}
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 gap-2 w-full">
                        <Navigation className="w-4 h-4" />
                        Abrir en Maps
                      </Button>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-lg">${selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
                
                {!selectedOrder.isPaid && (
                  <div className="p-3 bg-destructive/10 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      Cobrar ${(selectedOrder.totalAmount - selectedOrder.paidAmount).toFixed(2)} al entregar
                    </span>
                  </div>
                )}
                
                {selectedOrder.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Notas:</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Repartidor</DialogTitle>
            <DialogDescription>
              Selecciona un repartidor para el pedido {orderToAssign?.ticketCode}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {drivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => confirmAssignDriver(driver.id)}
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-all hover:border-primary hover:bg-primary/5',
                  driver.status !== 'available' && 'opacity-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{driver.avatar}</span>
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Zona {driver.zone} • {driver.currentOrders} pedidos activos
                      </p>
                    </div>
                  </div>
                  <Badge variant={driver.status === 'available' ? 'default' : 'secondary'}>
                    {driver.status === 'available' ? 'Disponible' : 'En ruta'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
