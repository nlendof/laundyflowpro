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
  ArrowRight,
  Play,
  DollarSign,
  PackageOpen,
  Home,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MOCK_ORDERS } from '@/lib/mockData';
import { Order, DeliveryServiceStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
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
type ServiceTab = 'pickups' | 'deliveries' | 'all';

interface DeliveryTask {
  order: Order;
  type: 'pickup' | 'delivery';
  status: DeliveryServiceStatus;
  address: string;
  slot?: 'morning' | 'afternoon';
  driverId?: string;
  notes?: string;
}

export default function Deliveries() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [drivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ServiceTab>('all');
  const [selectedSlot, setSelectedSlot] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryServiceStatus>('all');
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<DeliveryTask | null>(null);

  // Build delivery tasks from orders
  const deliveryTasks = useMemo((): DeliveryTask[] => {
    const tasks: DeliveryTask[] = [];
    
    orders.forEach(order => {
      // Add pickup task if order needs pickup
      if (order.needsPickup && order.pickupService) {
        tasks.push({
          order,
          type: 'pickup',
          status: order.pickupService.status,
          address: order.pickupService.address || order.customerAddress || '',
          slot: order.pickupService.scheduledSlot,
          driverId: order.pickupService.driverId,
          notes: order.pickupService.notes,
        });
      }
      
      // Add delivery task if order needs delivery
      if (order.needsDelivery && order.deliveryService) {
        // Only show delivery task when order is ready or later
        const readyStatuses = ['ready_delivery', 'in_transit', 'delivered'];
        if (readyStatuses.includes(order.status) || order.deliveryService.status !== 'pending') {
          tasks.push({
            order,
            type: 'delivery',
            status: order.deliveryService.status,
            address: order.deliveryService.address || order.customerAddress || '',
            slot: order.deliveryService.scheduledSlot,
            driverId: order.deliveryService.driverId,
            notes: order.deliveryService.notes,
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
      pendingPickups: pickupTasks.filter(t => t.status === 'pending').length,
      inProgressPickups: pickupTasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
      completedPickups: pickupTasks.filter(t => t.status === 'completed').length,
      pendingDeliveries: deliveryTasksOnly.filter(t => t.status === 'pending').length,
      inProgressDeliveries: deliveryTasksOnly.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
      completedDeliveries: deliveryTasksOnly.filter(t => t.status === 'completed').length,
      availableDrivers: drivers.filter(d => d.status === 'available').length,
    };
  }, [deliveryTasks, drivers]);

  const handleAssignDriver = (task: DeliveryTask) => {
    setTaskToAssign(task);
    setShowAssignDialog(true);
  };

  const confirmAssignDriver = (driverId: string) => {
    if (!taskToAssign) return;
    
    const driver = drivers.find(d => d.id === driverId);
    
    setOrders(prev => prev.map(o => {
      if (o.id === taskToAssign.order.id) {
        if (taskToAssign.type === 'pickup' && o.pickupService) {
          return {
            ...o,
            pickupService: {
              ...o.pickupService,
              status: 'assigned' as const,
              driverId,
            },
            updatedAt: new Date(),
          };
        } else if (taskToAssign.type === 'delivery' && o.deliveryService) {
          return {
            ...o,
            deliveryService: {
              ...o.deliveryService,
              status: 'assigned' as const,
              driverId,
            },
            deliveryDriverId: driverId,
            updatedAt: new Date(),
          };
        }
      }
      return o;
    }));
    
    toast.success(`${taskToAssign.type === 'pickup' ? 'Recogida' : 'Entrega'} asignada a ${driver?.name}`);
    setShowAssignDialog(false);
    setTaskToAssign(null);
  };

  const handleStartTask = (task: DeliveryTask) => {
    setOrders(prev => prev.map(o => {
      if (o.id === task.order.id) {
        if (task.type === 'pickup' && o.pickupService) {
          return {
            ...o,
            pickupService: {
              ...o.pickupService,
              status: 'in_progress' as const,
            },
            updatedAt: new Date(),
          };
        } else if (task.type === 'delivery' && o.deliveryService) {
          return {
            ...o,
            status: 'in_transit' as const,
            deliveryService: {
              ...o.deliveryService,
              status: 'in_progress' as const,
            },
            updatedAt: new Date(),
          };
        }
      }
      return o;
    }));
    toast.success(`${task.type === 'pickup' ? 'Recogida' : 'Entrega'} iniciada`);
  };

  const handleCompleteTask = (task: DeliveryTask) => {
    setOrders(prev => prev.map(o => {
      if (o.id === task.order.id) {
        if (task.type === 'pickup' && o.pickupService) {
          return {
            ...o,
            status: 'in_store' as const,
            pickupService: {
              ...o.pickupService,
              status: 'completed' as const,
              completedAt: new Date(),
            },
            updatedAt: new Date(),
          };
        } else if (task.type === 'delivery' && o.deliveryService) {
          return {
            ...o,
            status: 'delivered' as const,
            deliveryService: {
              ...o.deliveryService,
              status: 'completed' as const,
              completedAt: new Date(),
            },
            deliveredAt: new Date(),
            updatedAt: new Date(),
          };
        }
      }
      return o;
    }));
    toast.success(`¡${task.type === 'pickup' ? 'Recogida' : 'Entrega'} completada!`);
    setSelectedTask(null);
  };

  const getStatusConfig = (status: DeliveryServiceStatus, type: 'pickup' | 'delivery') => {
    const configs: Record<DeliveryServiceStatus, { label: string; color: string; icon: typeof Truck }> = {
      pending: { 
        label: 'Pendiente', 
        color: 'bg-amber-500', 
        icon: Clock 
      },
      assigned: { 
        label: 'Asignado', 
        color: 'bg-blue-500', 
        icon: User 
      },
      in_progress: { 
        label: type === 'pickup' ? 'Recogiendo' : 'En Camino', 
        color: 'bg-purple-500', 
        icon: type === 'pickup' ? ArrowDownToLine : Truck 
      },
      completed: { 
        label: 'Completado', 
        color: 'bg-green-600', 
        icon: CheckCircle 
      },
    };
    return configs[status];
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
            Entregas y Recogidas
          </h1>
          <p className="text-muted-foreground">Gestiona servicios a domicilio</p>
        </div>
        
        <div className="flex items-center gap-3">
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
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.pendingPickups} pendientes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.completedPickups} hoy
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
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.pendingDeliveries} pendientes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.completedDeliveries} hoy
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
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay tareas en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-3">
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
                              'p-2 rounded-lg text-white',
                              isPickup ? 'bg-gradient-to-br from-orange-500 to-amber-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                            )}>
                              {isPickup ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                            </div>
                            <div>
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
                                <MapPin className="w-3 h-3" />
                                {task.address}
                              </p>
                              {driver && (
                                <p className="text-sm text-primary flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" />
                                  {driver.avatar} {driver.name}
                                </p>
                              )}
                              {task.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  📝 {task.notes}
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
                                Cobrar
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
                            {task.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleAssignDriver(task); }}
                                className="gap-1"
                              >
                                <User className="w-3 h-3" />
                                Asignar
                              </Button>
                            )}
                            {task.status === 'assigned' && (
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleStartTask(task); }}
                                className="gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Iniciar
                              </Button>
                            )}
                            {task.status === 'in_progress' && (
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
              <CardDescription>Estado actual</CardDescription>
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
                      {driver.status === 'available' ? 'Libre' : 'En ruta'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-dashed">
                    <span className="text-xs text-muted-foreground">
                      📦 {driver.currentOrders} activos
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ✅ {driver.completedToday} hoy
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Task Details */}
          {selectedTask && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {selectedTask.type === 'pickup' ? (
                    <ArrowDownToLine className="w-5 h-5 text-orange-500" />
                  ) : (
                    <ArrowUpFromLine className="w-5 h-5 text-blue-500" />
                  )}
                  {selectedTask.type === 'pickup' ? 'Recogida' : 'Entrega'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket</p>
                  <p className="font-mono font-bold text-lg">{selectedTask.order.ticketCode}</p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedTask.order.customerName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <a 
                      href={`tel:${selectedTask.order.customerPhone}`} 
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedTask.order.customerPhone}
                    </a>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    {selectedTask.address}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 gap-2 w-full">
                    <Navigation className="w-4 h-4" />
                    Abrir en Maps
                  </Button>
                </div>

                {/* Service badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedTask.order.needsPickup && (
                    <Badge variant={selectedTask.order.pickupService?.status === 'completed' ? 'default' : 'outline'} 
                           className={selectedTask.order.pickupService?.status === 'completed' ? 'bg-green-600' : ''}>
                      {selectedTask.order.pickupService?.status === 'completed' ? '✅' : '📦'} Recogida
                    </Badge>
                  )}
                  {selectedTask.order.needsDelivery && (
                    <Badge variant={selectedTask.order.deliveryService?.status === 'completed' ? 'default' : 'outline'}
                           className={selectedTask.order.deliveryService?.status === 'completed' ? 'bg-green-600' : ''}>
                      {selectedTask.order.deliveryService?.status === 'completed' ? '✅' : '🚚'} Entrega
                    </Badge>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-lg">${selectedTask.order.totalAmount.toFixed(2)}</span>
                </div>
                
                {!selectedTask.order.isPaid && selectedTask.type === 'delivery' && (
                  <div className="p-3 bg-destructive/10 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      Cobrar ${(selectedTask.order.totalAmount - selectedTask.order.paidAmount).toFixed(2)} al entregar
                    </span>
                  </div>
                )}
                
                {selectedTask.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Notas:</p>
                    <p className="text-sm text-muted-foreground">{selectedTask.notes}</p>
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
            <DialogTitle>
              Asignar Repartidor - {taskToAssign?.type === 'pickup' ? 'Recogida' : 'Entrega'}
            </DialogTitle>
            <DialogDescription>
              Pedido {taskToAssign?.order.ticketCode} • {taskToAssign?.order.customerName}
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
                        Zona {driver.zone} • {driver.currentOrders} tareas activas
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
