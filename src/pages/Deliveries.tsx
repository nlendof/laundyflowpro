import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Truck,
  Search,
  MapPin,
  Clock,
  Phone,
  Package,
  CheckCircle,
  User,
  Play,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useOrders } from '@/hooks/useOrders';
import { useDrivers, Driver } from '@/hooks/useDrivers';
import { Order, PickupServiceStatus, DeliveryServiceStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { useConfig } from '@/contexts/ConfigContext';

type ServiceTab = 'pickups' | 'deliveries' | 'all';

// Task status that unifies both pickup and delivery statuses for UI
type TaskStatus = PickupServiceStatus | DeliveryServiceStatus;

interface DeliveryTask {
  order: Order;
  type: 'pickup' | 'delivery';
  status: TaskStatus;
  address: string;
  slot?: string; // Time slot like "09:00" or legacy "morning"/"afternoon"
  driverId?: string;
  notes?: string;
}

export default function Deliveries() {
  const { business } = useConfig();
  const { orders, loading: ordersLoading, fetchOrders } = useOrders();
  const { 
    drivers, 
    loading: driversLoading, 
    fetchDrivers,
    assignPickupDriver,
    assignDeliveryDriver,
    completePickup,
    completeDelivery,
    startPickup,
    startDelivery,
  } = useDrivers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ServiceTab>('all');
  const [selectedSlot, setSelectedSlot] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<DeliveryTask | null>(null);

  const loading = ordersLoading || driversLoading;

  // Build delivery tasks from orders
  const deliveryTasks = useMemo((): DeliveryTask[] => {
    const tasks: DeliveryTask[] = [];
    
    orders.forEach(order => {
      // Add pickup task if order needs pickup
      if (order.needsPickup) {
        const pickupStatus = order.pickupService?.status || 'pending_pickup';
        
        tasks.push({
          order,
          type: 'pickup',
          status: pickupStatus,
          address: order.pickupService?.address || order.customerAddress || '',
          slot: order.pickupService?.scheduledSlot,
          driverId: order.pickupService?.driverId,
          notes: order.notes,
        });
      }
      
      // Add delivery task if order needs delivery
      if (order.needsDelivery) {
        // Only show delivery task when order is ready or later
        const readyStatuses = ['ready_delivery', 'in_transit', 'delivered'];
        const deliveryStatus = order.deliveryService?.status || 'pending_delivery';
        
        if (readyStatuses.includes(order.status) || order.deliveryService?.driverId) {
          tasks.push({
            order,
            type: 'delivery',
            status: deliveryStatus,
            address: order.deliveryService?.address || order.customerAddress || '',
            slot: order.deliveryService?.scheduledSlot,
            driverId: order.deliveryService?.driverId,
            notes: order.notes,
          });
        }
      }
    });
    
    return tasks;
  }, [orders]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return deliveryTasks.filter(task => {
      // Tab filter
      if (activeTab === 'pickups' && task.type !== 'pickup') return false;
      if (activeTab === 'deliveries' && task.type !== 'delivery') return false;
      
      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      
      // Slot filter
      if (selectedSlot !== 'all' && task.slot !== selectedSlot) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.order.ticketCode.toLowerCase().includes(query) ||
          task.order.customerName.toLowerCase().includes(query) ||
          task.order.customerPhone.includes(query) ||
          task.address.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [deliveryTasks, activeTab, statusFilter, selectedSlot, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const pickupTasks = deliveryTasks.filter(t => t.type === 'pickup');
    const deliveryTasksOnly = deliveryTasks.filter(t => t.type === 'delivery');
    
    return {
      pendingPickups: pickupTasks.filter(t => t.status === 'pending_pickup').length,
      inProgressPickups: pickupTasks.filter(t => t.status === 'on_way_to_store').length,
      completedPickups: pickupTasks.filter(t => t.status === 'received').length,
      pendingDeliveries: deliveryTasksOnly.filter(t => t.status === 'pending_delivery').length,
      inProgressDeliveries: deliveryTasksOnly.filter(t => t.status === 'in_transit').length,
      completedDeliveries: deliveryTasksOnly.filter(t => t.status === 'delivered').length,
      availableDrivers: drivers.filter(d => d.status === 'available').length,
    };
  }, [deliveryTasks, drivers]);

  const handleAssignDriver = (task: DeliveryTask) => {
    setTaskToAssign(task);
    setShowAssignDialog(true);
  };

  const confirmAssignDriver = async (driverId: string) => {
    if (!taskToAssign) return;
    
    const driver = drivers.find(d => d.id === driverId);
    let success = false;
    
    if (taskToAssign.type === 'pickup') {
      success = await assignPickupDriver(taskToAssign.order.id, driverId);
    } else {
      success = await assignDeliveryDriver(taskToAssign.order.id, driverId);
    }
    
    if (success) {
      toast.success(`${taskToAssign.type === 'pickup' ? 'Recogida' : 'Entrega'} asignada a ${driver?.name}`);
      await fetchOrders();
    }
    
    setShowAssignDialog(false);
    setTaskToAssign(null);
  };

  const handleStartTask = async (task: DeliveryTask) => {
    let success = false;
    
    if (task.type === 'pickup') {
      success = await startPickup(task.order.id);
    } else {
      success = await startDelivery(task.order.id);
    }
    
    if (success) {
      toast.success(`${task.type === 'pickup' ? 'Recogida' : 'Entrega'} iniciada`);
      await fetchOrders();
    }
  };

  const handleCompleteTask = async (task: DeliveryTask) => {
    let success = false;
    
    if (task.type === 'pickup') {
      success = await completePickup(task.order.id);
    } else {
      success = await completeDelivery(task.order.id);
    }
    
    if (success) {
      toast.success(`¡${task.type === 'pickup' ? 'Recogida' : 'Entrega'} completada!`);
      await fetchOrders();
      setSelectedTask(null);
    }
  };

  const getStatusConfig = (status: TaskStatus, type: 'pickup' | 'delivery') => {
    // Pickup status configs
    const pickupConfigs: Record<PickupServiceStatus, { label: string; color: string; icon: typeof Truck }> = {
      pending_pickup: { 
        label: 'Pendiente', 
        color: 'bg-amber-500', 
        icon: Clock 
      },
      on_way_to_store: { 
        label: 'Camino al Local', 
        color: 'bg-purple-500', 
        icon: ArrowDownToLine 
      },
      received: { 
        label: 'Recibido', 
        color: 'bg-green-600', 
        icon: CheckCircle 
      },
    };
    
    // Delivery status configs
    const deliveryConfigs: Record<DeliveryServiceStatus, { label: string; color: string; icon: typeof Truck }> = {
      pending_delivery: { 
        label: 'Pendiente Envío', 
        color: 'bg-amber-500', 
        icon: Clock 
      },
      in_transit: { 
        label: 'En Camino', 
        color: 'bg-purple-500', 
        icon: Truck 
      },
      delivered: { 
        label: 'Entregado', 
        color: 'bg-green-600', 
        icon: CheckCircle 
      },
    };
    
    if (type === 'pickup') {
      return pickupConfigs[status as PickupServiceStatus] || pickupConfigs.pending_pickup;
    }
    return deliveryConfigs[status as DeliveryServiceStatus] || deliveryConfigs.pending_delivery;
  };

  const getDriverById = (driverId?: string) => {
    return drivers.find(d => d.id === driverId);
  };

  const handleRefresh = async () => {
    await Promise.all([fetchOrders(), fetchDrivers()]);
    toast.success('Datos actualizados');
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            Entregas y Recogidas
          </h1>
          <p className="text-muted-foreground">Gestiona servicios a domicilio</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedSlot} onValueChange={(v) => setSelectedSlot(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="morning">🌅 Mañana</SelectItem>
              <SelectItem value="afternoon">🌆 Tarde</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="assigned">Asignados</SelectItem>
              <SelectItem value="in_progress">En Curso</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Pickup Stats */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg text-white">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {stats.pendingPickups + stats.inProgressPickups}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-500">Recogidas Activas</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {stats.pendingPickups} pendientes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.completedPickups} completadas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Stats */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white">
                <ArrowUpFromLine className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.pendingDeliveries + stats.inProgressDeliveries}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Entregas Activas</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {stats.pendingDeliveries} pendientes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.completedDeliveries} completadas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg text-white">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {stats.inProgressPickups + stats.inProgressDeliveries}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-500">En Ruta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drivers */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {stats.availableDrivers}/{drivers.length}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ServiceTab)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="all" className="gap-2">
                    <Package className="w-4 h-4" />
                    Todos
                  </TabsTrigger>
                  <TabsTrigger value="pickups" className="gap-2">
                    <ArrowDownToLine className="w-4 h-4" />
                    Recogidas
                  </TabsTrigger>
                  <TabsTrigger value="deliveries" className="gap-2">
                    <ArrowUpFromLine className="w-4 h-4" />
                    Entregas
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay tareas en esta categoría</p>
                  {drivers.length === 0 && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        No hay repartidores registrados. Agrega empleados con rol "delivery" en la sección de Empleados.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredTasks.map((task, index) => {
                    const statusConfig = getStatusConfig(task.status, task.type);
                    const StatusIcon = statusConfig.icon;
                    const driver = getDriverById(task.driverId);
                    const isPickup = task.type === 'pickup';
                    
                    return (
                      <div
                        key={`${task.order.id}-${task.type}-${index}`}
                        className={cn(
                          'p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/50',
                          selectedTask?.order.id === task.order.id && selectedTask?.type === task.type && 'border-primary bg-primary/5'
                        )}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'p-2 rounded-lg text-white shrink-0',
                              isPickup ? 'bg-gradient-to-br from-orange-500 to-amber-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                            )}>
                              {isPickup ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn(
                                  'text-xs',
                                  isPickup ? 'border-orange-300 text-orange-700 dark:text-orange-400' : 'border-blue-300 text-blue-700 dark:text-blue-400'
                                )}>
                                  {isPickup ? '📦 Recogida' : '🚚 Entrega'}
                                </Badge>
                                <span className="font-mono font-bold text-sm">{task.order.ticketCode}</span>
                                {task.slot && (
                                  <Badge variant="secondary" className="text-xs">
                                    {task.slot === 'morning' ? '🌅 Mañana' : '🌆 Tarde'}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium mt-1">{task.order.customerName}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.address || 'Sin dirección'}</span>
                              </p>
                              {task.order.customerPhone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  {task.order.customerPhone}
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
                          
                          <div className="text-right shrink-0">
                            <Badge className={cn('text-white', statusConfig.color)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {!task.order.isPaid && task.type === 'delivery' && (
                              <Badge variant="destructive" className="mt-2 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(task.order.totalAmount - task.order.paidAmount, business.currency)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(task.order.updatedAt, { locale: es, addSuffix: true })}
                          </span>
                          
                          <div className="flex gap-2">
                            {/* Pickup: pending_pickup -> can assign driver */}
                            {task.type === 'pickup' && task.status === 'pending_pickup' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleAssignDriver(task); }}
                                className="gap-1"
                                disabled={drivers.length === 0}
                              >
                                <User className="w-3 h-3" />
                                Asignar
                              </Button>
                            )}
                            {/* Pickup: on_way_to_store -> can mark as received */}
                            {task.type === 'pickup' && task.status === 'on_way_to_store' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={(e) => { e.stopPropagation(); handleCompleteTask(task); }}
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Marcar Recibido
                              </Button>
                            )}
                            {/* Delivery: pending_delivery -> can assign driver */}
                            {task.type === 'delivery' && task.status === 'pending_delivery' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleAssignDriver(task); }}
                                className="gap-1"
                                disabled={drivers.length === 0}
                              >
                                <User className="w-3 h-3" />
                                Asignar
                              </Button>
                            )}
                            {/* Delivery: in_transit -> can mark as delivered */}
                            {task.type === 'delivery' && task.status === 'in_transit' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={(e) => { e.stopPropagation(); handleCompleteTask(task); }}
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Completar
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

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Drivers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Repartidores
              </CardTitle>
              <CardDescription>
                {drivers.length === 0 
                  ? 'No hay repartidores registrados'
                  : `${stats.availableDrivers} disponible${stats.availableDrivers !== 1 ? 's' : ''}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drivers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Agrega empleados con rol "delivery"</p>
                </div>
              ) : (
                drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      driver.status === 'available' 
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : driver.status === 'offline'
                          ? 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800 opacity-60'
                          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{driver.avatar}</span>
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          {driver.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {driver.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          driver.status === 'available' ? 'default' : 
                          driver.status === 'offline' ? 'secondary' : 'outline'
                        } className={cn(
                          driver.status === 'available' && 'bg-green-600',
                          driver.status === 'delivering' && 'bg-blue-600 text-white'
                        )}>
                          {driver.status === 'available' ? 'Disponible' : 
                           driver.status === 'offline' ? 'Offline' : 'En ruta'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {driver.completedToday} completadas hoy
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Selected Task Details */}
          {selectedTask && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {selectedTask.type === 'pickup' ? (
                    <ArrowDownToLine className="w-5 h-5 text-orange-500" />
                  ) : (
                    <ArrowUpFromLine className="w-5 h-5 text-blue-500" />
                  )}
                  Detalles de la tarea
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket</p>
                  <p className="font-mono font-bold">{selectedTask.order.ticketCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedTask.order.customerName}</p>
                  {selectedTask.order.customerPhone && (
                    <p className="text-sm text-muted-foreground">{selectedTask.order.customerPhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="text-sm">{selectedTask.address || 'Sin dirección'}</p>
                </div>
                {selectedTask.type === 'delivery' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Monto</p>
                    <p className="font-bold text-lg">
                      {formatCurrency(selectedTask.order.totalAmount, business.currency)}
                    </p>
                    {!selectedTask.order.isPaid && (
                      <Badge variant="destructive" className="mt-1">
                        Pendiente: {formatCurrency(selectedTask.order.totalAmount - selectedTask.order.paidAmount, business.currency)}
                      </Badge>
                    )}
                  </div>
                )}
                {selectedTask.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{selectedTask.notes}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t space-y-2">
                  {/* Pickup: pending_pickup -> can assign */}
                  {selectedTask.type === 'pickup' && selectedTask.status === 'pending_pickup' && (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleAssignDriver(selectedTask)}
                      disabled={drivers.length === 0}
                    >
                      <User className="w-4 h-4" />
                      Asignar Repartidor
                    </Button>
                  )}
                  {/* Pickup: on_way_to_store -> can mark as received */}
                  {selectedTask.type === 'pickup' && selectedTask.status === 'on_way_to_store' && (
                    <Button 
                      className="w-full gap-2 bg-green-600 hover:bg-green-700" 
                      onClick={() => handleCompleteTask(selectedTask)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marcar como Recibido
                    </Button>
                  )}
                  {/* Delivery: pending_delivery -> can assign */}
                  {selectedTask.type === 'delivery' && selectedTask.status === 'pending_delivery' && (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleAssignDriver(selectedTask)}
                      disabled={drivers.length === 0}
                    >
                      <User className="w-4 h-4" />
                      Asignar Repartidor
                    </Button>
                  )}
                  {/* Delivery: in_transit -> can complete */}
                  {selectedTask.type === 'delivery' && selectedTask.status === 'in_transit' && (
                    <Button 
                      className="w-full gap-2 bg-green-600 hover:bg-green-700" 
                      onClick={() => handleCompleteTask(selectedTask)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marcar como Entregado
                    </Button>
                  )}
                </div>
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
              Selecciona un repartidor para esta {taskToAssign?.type === 'pickup' ? 'recogida' : 'entrega'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {drivers.filter(d => d.status !== 'offline').length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No hay repartidores disponibles</p>
              </div>
            ) : (
              drivers.filter(d => d.status !== 'offline').map((driver) => (
                <div
                  key={driver.id}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all hover:border-primary',
                    driver.status === 'available' 
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  )}
                  onClick={() => confirmAssignDriver(driver.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{driver.avatar}</span>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {driver.currentOrders} en curso • {driver.completedToday} hoy
                        </p>
                      </div>
                    </div>
                    <Badge variant={driver.status === 'available' ? 'default' : 'secondary'} className={cn(
                      driver.status === 'available' && 'bg-green-600'
                    )}>
                      {driver.status === 'available' ? 'Disponible' : 'En ruta'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
