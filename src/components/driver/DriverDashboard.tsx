import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, Package, LogOut, MapPin, Phone, 
  Clock, CheckCircle, Navigation, History,
  ArrowUpFromLine, ArrowDownToLine, Play, Store
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DriverDashboardProps {
  session: Session;
}

interface PickupTask {
  id: string;
  ticket_code: string;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  status: 'pending_pickup' | 'on_way_to_store';
  slot: string | null;
  notes: string | null;
  latitude?: number;
  longitude?: number;
}

interface DeliveryTask {
  id: string;
  ticket_code: string;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  status: 'ready_delivery' | 'in_transit';
  slot: string | null;
  notes: string | null;
  latitude?: number;
  longitude?: number;
}

interface CompletedTask {
  id: string;
  ticket_code: string;
  customer_name: string;
  type: 'pickup' | 'delivery';
  completed_at: string;
}

export default function DriverDashboard({ session }: DriverDashboardProps) {
  const [activeTab, setActiveTab] = useState('pickups');
  const [pickupTasks, setPickupTasks] = useState<PickupTask[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverName, setDriverName] = useState('');

  useEffect(() => {
    fetchDriverInfo();
    fetchTasks();
    const unsubscribe = subscribeToOrders();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session]);

  const fetchDriverInfo = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .maybeSingle();

    if (data) {
      setDriverName(data.name);
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);

    // Fetch pending pickups assigned to this driver
    // Status: pending_pickup (just assigned) or on_way_to_store (driver started)
    const { data: pickups } = await supabase
      .from('orders')
      .select('*')
      .eq('pickup_driver_id', session.user.id)
      .eq('needs_pickup', true)
      .in('status', ['pending_pickup']);

    const pickupList: PickupTask[] = (pickups || []).map(order => ({
      id: order.id,
      ticket_code: order.ticket_code,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      address: order.pickup_address || order.customer_address,
      status: order.status as 'pending_pickup' | 'on_way_to_store',
      slot: order.pickup_slot,
      notes: order.notes,
      latitude: order.pickup_latitude ?? undefined,
      longitude: order.pickup_longitude ?? undefined,
    }));

    setPickupTasks(pickupList);

    // Fetch pending deliveries assigned to this driver
    // Status: ready_delivery (assigned) or in_transit (on the way)
    const { data: deliveries } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_driver_id', session.user.id)
      .eq('needs_delivery', true)
      .in('status', ['ready_delivery', 'in_transit']);

    const deliveryList: DeliveryTask[] = (deliveries || []).map(order => ({
      id: order.id,
      ticket_code: order.ticket_code,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      address: order.delivery_address || order.customer_address,
      status: order.status as 'ready_delivery' | 'in_transit',
      slot: order.delivery_slot,
      notes: order.notes,
      latitude: order.delivery_latitude ?? undefined,
      longitude: order.delivery_longitude ?? undefined,
    }));

    setDeliveryTasks(deliveryList);

    // Fetch completed tasks (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: completedPickups } = await supabase
      .from('orders')
      .select('*')
      .eq('pickup_driver_id', session.user.id)
      .not('pickup_completed_at', 'is', null)
      .gte('pickup_completed_at', today.toISOString());

    const { data: completedDeliveries } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_driver_id', session.user.id)
      .eq('status', 'delivered')
      .gte('delivered_at', today.toISOString());

    const completed: CompletedTask[] = [];

    completedPickups?.forEach(order => {
      completed.push({
        id: order.id,
        ticket_code: order.ticket_code,
        customer_name: order.customer_name,
        type: 'pickup',
        completed_at: order.pickup_completed_at!,
      });
    });

    completedDeliveries?.forEach(order => {
      completed.push({
        id: order.id,
        ticket_code: order.ticket_code,
        customer_name: order.customer_name,
        type: 'delivery',
        completed_at: order.delivery_completed_at || order.delivered_at!,
      });
    });

    // Sort by completion time, most recent first
    completed.sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    setCompletedTasks(completed);
    setIsLoading(false);
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel('driver-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // For pickups: Driver starts pickup -> on_way_to_store
  const handleStartPickup = async (task: PickupTask) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'pending_pickup' }) // Status stays pending_pickup until cashier receives
      .eq('id', task.id);

    if (error) {
      toast.error('Error al iniciar recogida');
      return;
    }

    toast.success('En camino a recoger');
    fetchTasks();
  };

  // For pickups: Driver delivers to store -> in_store (cashier will mark as received)
  // The pickup is marked as complete for the driver when arriving at store
  const handleArriveAtStore = async (task: PickupTask) => {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'in_store',
        pickup_completed_at: now,
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Error al completar recogida');
      return;
    }

    toast.success('Recogida entregada en local');
    fetchTasks();
  };

  // For deliveries: Start delivery -> in_transit
  const handleStartDelivery = async (task: DeliveryTask) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'in_transit' })
      .eq('id', task.id);

    if (error) {
      toast.error('Error al iniciar entrega');
      return;
    }

    toast.success('Entrega en camino');
    fetchTasks();
  };

  // For deliveries: Complete delivery -> delivered
  const handleCompleteDelivery = async (task: DeliveryTask) => {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivery_completed_at: now,
        delivered_at: now,
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Error al completar entrega');
      return;
    }

    toast.success('Entrega completada');
    fetchTasks();
  };

  const openNavigation = (address: string | null, latitude?: number, longitude?: number) => {
    if (latitude && longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        '_blank'
      );
    } else if (address) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
        '_blank'
      );
    } else {
      toast.error('No hay dirección disponible');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada');
  };

  const getPickupStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_pickup': return 'Pendiente';
      case 'on_way_to_store': return 'En Camino al Local';
      default: return status;
    }
  };

  const getDeliveryStatusLabel = (status: string) => {
    switch (status) {
      case 'ready_delivery': return 'Pendiente';
      case 'in_transit': return 'En Camino';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Repartidor</h1>
              <p className="text-xs text-muted-foreground">{driverName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
          <CardContent className="p-3 text-center">
            <ArrowUpFromLine className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xl font-bold">{pickupTasks.length}</p>
            <p className="text-xs text-muted-foreground">Recogidas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-3 text-center">
            <ArrowDownToLine className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold">{deliveryTasks.length}</p>
            <p className="text-xs text-muted-foreground">Entregas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="px-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pickups" className="gap-1 text-xs">
              <ArrowUpFromLine className="w-4 h-4" />
              Recogidas
              {pickupTasks.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {pickupTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-1 text-xs">
              <ArrowDownToLine className="w-4 h-4" />
              Entregas
              {deliveryTasks.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {deliveryTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pickups Tab */}
        <TabsContent value="pickups" className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pickupTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ArrowUpFromLine className="w-12 h-12 mx-auto mb-4 text-orange-300" />
                <p className="font-medium">Sin recogidas pendientes</p>
                <p className="text-sm">Las nuevas recogidas aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pickupTasks.map(task => (
                <Card key={task.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Task Header */}
                    <div className="p-3 flex items-center gap-2 bg-orange-100 text-orange-800">
                      <ArrowUpFromLine className="w-5 h-5" />
                      <span className="font-bold">RECOGER</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getPickupStatusLabel(task.status)}
                      </Badge>
                      <span className="ml-auto font-mono">{task.ticket_code}</span>
                    </div>

                    {/* Task Details */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{task.customer_name}</span>
                        {task.slot && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.slot}
                          </Badge>
                        )}
                      </div>

                      {task.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{task.address}</span>
                        </div>
                      )}

                      {task.notes && (
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          📝 {task.notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {task.customer_phone && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`tel:${task.customer_phone}`, '_self')}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Llamar
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openNavigation(task.address, task.latitude, task.longitude)}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Navegar
                        </Button>
                        <Button 
                          size="sm"
                          className="ml-auto"
                          onClick={() => handleArriveAtStore(task)}
                        >
                          <Store className="w-4 h-4 mr-1" />
                          Entregar en Local
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : deliveryTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ArrowDownToLine className="w-12 h-12 mx-auto mb-4 text-blue-300" />
                <p className="font-medium">Sin entregas pendientes</p>
                <p className="text-sm">Las nuevas entregas aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {deliveryTasks.map(task => (
                <Card key={task.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Task Header */}
                    <div className="p-3 flex items-center gap-2 bg-blue-100 text-blue-800">
                      <ArrowDownToLine className="w-5 h-5" />
                      <span className="font-bold">ENTREGAR</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getDeliveryStatusLabel(task.status)}
                      </Badge>
                      <span className="ml-auto font-mono">{task.ticket_code}</span>
                    </div>

                    {/* Task Details */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{task.customer_name}</span>
                        {task.slot && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.slot}
                          </Badge>
                        )}
                      </div>

                      {task.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{task.address}</span>
                        </div>
                      )}

                      {task.notes && (
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          📝 {task.notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {task.customer_phone && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`tel:${task.customer_phone}`, '_self')}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Llamar
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openNavigation(task.address, task.latitude, task.longitude)}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Navegar
                        </Button>
                        {task.status === 'ready_delivery' ? (
                          <Button 
                            size="sm"
                            variant="secondary"
                            className="ml-auto"
                            onClick={() => handleStartDelivery(task)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Iniciar Entrega
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            className="ml-auto"
                            onClick={() => handleCompleteDelivery(task)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Marcar Entregado
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="p-4">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Sin historial hoy</p>
                <p className="text-sm">Las tareas completadas aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedTasks.map(task => (
                <Card key={`${task.id}-${task.type}-completed`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      task.type === 'pickup' 
                        ? 'bg-orange-100' 
                        : 'bg-blue-100'
                    }`}>
                      {task.type === 'pickup' ? (
                        <ArrowUpFromLine className="w-5 h-5 text-orange-600" />
                      ) : (
                        <ArrowDownToLine className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{task.ticket_code}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.type === 'pickup' ? 'Recogida' : 'Entrega'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{task.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.completed_at), "HH:mm", { locale: es })}
                      </p>
                      <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
