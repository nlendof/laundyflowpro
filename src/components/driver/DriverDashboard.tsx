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
  ArrowUpFromLine, ArrowDownToLine
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DriverDashboardProps {
  session: Session;
}

interface DeliveryTask {
  id: string;
  ticket_code: string;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  type: 'pickup' | 'delivery';
  status: string;
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
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingTasks, setPendingTasks] = useState<DeliveryTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverName, setDriverName] = useState('');

  useEffect(() => {
    fetchDriverInfo();
    fetchTasks();
    subscribeToOrders();
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
    const { data: pickups } = await supabase
      .from('orders')
      .select('*')
      .eq('pickup_driver_id', session.user.id)
      .eq('needs_pickup', true)
      .eq('status', 'pending_pickup');

    // Fetch pending deliveries assigned to this driver
    const { data: deliveries } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_driver_id', session.user.id)
      .eq('needs_delivery', true)
      .in('status', ['ready_delivery', 'in_transit']);

    const tasks: DeliveryTask[] = [];

    pickups?.forEach(order => {
      tasks.push({
        id: order.id,
        ticket_code: order.ticket_code,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        address: order.pickup_address || order.customer_address,
        type: 'pickup',
        status: order.status,
        slot: order.pickup_slot,
        notes: order.notes,
        latitude: order.pickup_latitude,
        longitude: order.pickup_longitude,
      });
    });

    deliveries?.forEach(order => {
      tasks.push({
        id: order.id,
        ticket_code: order.ticket_code,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        address: order.delivery_address || order.customer_address,
        type: 'delivery',
        status: order.status,
        slot: order.delivery_slot,
        notes: order.notes,
        latitude: order.delivery_latitude,
        longitude: order.delivery_longitude,
      });
    });

    setPendingTasks(tasks);

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
      .not('delivery_completed_at', 'is', null)
      .gte('delivery_completed_at', today.toISOString());

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

  const handleCompleteTask = async (task: DeliveryTask) => {
    const now = new Date().toISOString();

    if (task.type === 'pickup') {
      // Mark pickup as complete and move order to in_store
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'in_store',
          pickup_completed_at: now,
        })
        .eq('id', task.id);

      if (error) {
        toast.error('Error al completar la recogida');
        return;
      }

      toast.success('Recogida completada');
    } else {
      // Mark delivery as complete
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivery_completed_at: now,
          delivered_at: now,
        })
        .eq('id', task.id);

      if (error) {
        toast.error('Error al completar la entrega');
        return;
      }

      toast.success('Entrega completada');
    }

    fetchTasks();
  };

  const handleStartDelivery = async (task: DeliveryTask) => {
    if (task.type === 'delivery' && task.status === 'ready_delivery') {
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
    }
  };

  const openNavigation = (task: DeliveryTask) => {
    if (task.latitude && task.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`,
        '_blank'
      );
    } else if (task.address) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`,
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
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTasks.length}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks.length}</p>
              <p className="text-xs text-muted-foreground">Hoy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="px-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <Package className="w-4 h-4" />
              Pendientes
              {pendingTasks.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium">¡Todo al día!</p>
                <p className="text-sm">No tienes tareas pendientes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map(task => (
                <Card key={`${task.id}-${task.type}`} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Task Header */}
                    <div className={`p-3 flex items-center gap-2 ${
                      task.type === 'pickup' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {task.type === 'pickup' ? (
                        <ArrowUpFromLine className="w-5 h-5" />
                      ) : (
                        <ArrowDownToLine className="w-5 h-5" />
                      )}
                      <span className="font-bold">
                        {task.type === 'pickup' ? 'RECOGER' : 'ENTREGAR'}
                      </span>
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
                      <div className="flex gap-2 pt-2">
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
                          onClick={() => openNavigation(task)}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Navegar
                        </Button>
                        {task.type === 'delivery' && task.status === 'ready_delivery' && (
                          <Button 
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStartDelivery(task)}
                          >
                            Iniciar Entrega
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          className="ml-auto"
                          onClick={() => handleCompleteTask(task)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
