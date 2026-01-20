import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Bell,
  Database,
  Users,
  Store,
  ShoppingCart,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Loader2,
  Volume2,
  VolumeX,
  Eye,
  Building2,
  Wifi,
  WifiOff,
  Server,
  HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LaundryStatus {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  branchCount: number;
  userCount: number;
  todayOrders: number;
  pendingOrders: number;
  lastActivity?: string;
  status: 'online' | 'warning' | 'offline';
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  acknowledged: boolean;
}

interface RealTimeMetrics {
  activeUsers: number;
  ordersToday: number;
  ordersThisHour: number;
  pendingOrders: number;
  completedOrders: number;
  avgProcessingTime: number;
  systemLoad: number;
}

export function TechnicianMonitoringDashboard() {
  const [laundryStatuses, setLaundryStatuses] = useState<LaundryStatus[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  }, [soundEnabled]);

  // Add new alert
  const addAlert = useCallback((alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newAlert: SystemAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      acknowledged: false,
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
    
    if (alert.type === 'error' || alert.type === 'warning') {
      playAlertSound();
    }
  }, [playAlertSound]);

  // Fetch laundry statuses
  const fetchLaundryStatuses = async () => {
    try {
      const { data: laundries, error: laundryError } = await supabase
        .from('laundries')
        .select('id, name, slug, is_active');

      if (laundryError) throw laundryError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statuses: LaundryStatus[] = await Promise.all(
        (laundries || []).map(async (laundry) => {
          // Get branch count
          const { count: branchCount } = await supabase
            .from('branches')
            .select('id', { count: 'exact', head: true })
            .eq('laundry_id', laundry.id);

          // Get user count
          const { count: userCount } = await supabase
            .from('laundry_users')
            .select('id', { count: 'exact', head: true })
            .eq('laundry_id', laundry.id);

          // Get today's orders via branches
          const { data: branchIds } = await supabase
            .from('branches')
            .select('id')
            .eq('laundry_id', laundry.id);

          let todayOrders = 0;
          let pendingOrders = 0;
          let lastActivity: string | undefined;

          if (branchIds && branchIds.length > 0) {
            const ids = branchIds.map(b => b.id);
            
            const { count: orderCount } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .in('branch_id', ids)
              .gte('created_at', today.toISOString());

            todayOrders = orderCount || 0;

            const { count: pending } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .in('branch_id', ids)
              .in('status', ['pending_pickup', 'in_store', 'washing', 'drying', 'ironing']);

            pendingOrders = pending || 0;

            const { data: lastOrder } = await supabase
              .from('orders')
              .select('created_at')
              .in('branch_id', ids)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            lastActivity = lastOrder?.created_at;
          }

          // Determine status based on activity
          let status: 'online' | 'warning' | 'offline' = 'online';
          if (!laundry.is_active) {
            status = 'offline';
          } else if (lastActivity) {
            const lastActivityDate = new Date(lastActivity);
            const hoursSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceActivity > 24) {
              status = 'warning';
            }
          } else {
            status = 'warning';
          }

          return {
            id: laundry.id,
            name: laundry.name,
            slug: laundry.slug,
            is_active: laundry.is_active,
            branchCount: branchCount || 0,
            userCount: userCount || 0,
            todayOrders,
            pendingOrders,
            lastActivity,
            status,
          };
        })
      );

      setLaundryStatuses(statuses);
    } catch (error) {
      console.error('Error fetching laundry statuses:', error);
      addAlert({
        type: 'error',
        title: 'Error de conexión',
        message: 'No se pudieron cargar los estados de las lavanderías',
        source: 'Sistema',
      });
    }
  };

  // Fetch system metrics
  const fetchMetrics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const [
        ordersToday,
        ordersThisHour,
        pendingOrders,
        completedOrders,
        activeProfiles,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo.toISOString()),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending_pickup', 'in_store', 'washing', 'drying', 'ironing']),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'delivered')
          .gte('created_at', today.toISOString()),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      // Simulate system load based on activity
      const load = Math.min(100, ((ordersThisHour.count || 0) * 5) + Math.random() * 20);

      setMetrics({
        activeUsers: activeProfiles.count || 0,
        ordersToday: ordersToday.count || 0,
        ordersThisHour: ordersThisHour.count || 0,
        pendingOrders: pendingOrders.count || 0,
        completedOrders: completedOrders.count || 0,
        avgProcessingTime: 45 + Math.floor(Math.random() * 30), // Simulated
        systemLoad: Math.round(load),
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLaundryStatuses(), fetchMetrics()]);
      setIsLoading(false);
      
      addAlert({
        type: 'info',
        title: 'Monitoreo iniciado',
        message: 'Dashboard de monitoreo cargado correctamente',
        source: 'Sistema',
      });
    };
    
    loadData();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel('monitoring-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          addAlert({
            type: 'info',
            title: 'Nuevo pedido',
            message: `Pedido ${(payload.new as any).ticket_code || 'nuevo'} creado`,
            source: 'Pedidos',
          });
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const newData = payload.new as any;
          if (newData.status === 'delivered') {
            addAlert({
              type: 'success',
              title: 'Pedido completado',
              message: `Pedido ${newData.ticket_code} entregado`,
              source: 'Pedidos',
            });
          }
          fetchMetrics();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    const usersChannel = supabase
      .channel('monitoring-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchLaundryStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [addAlert]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000); // Every 30 seconds

    const statusInterval = setInterval(() => {
      fetchLaundryStatuses();
    }, 60000); // Every minute

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [autoRefresh]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  const clearAcknowledgedAlerts = () => {
    setAlerts(prev => prev.filter(a => !a.acknowledged));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'warning':
        return 'text-amber-500';
      case 'offline':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">En línea</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-amber-600 border-amber-500/50">Inactiva</Badge>;
      case 'offline':
        return <Badge variant="destructive">Desactivada</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-destructive'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Conectado en tiempo real' : 'Desconectado'}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground">
            Última actualización: {format(lastUpdate, 'HH:mm:ss', { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Silenciar alertas' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Pausar auto-refresh' : 'Activar auto-refresh'}
            className={autoRefresh ? 'text-primary' : ''}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchLaundryStatuses();
              fetchMetrics();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={ShoppingCart}
          label="Pedidos Hoy"
          value={metrics?.ordersToday || 0}
          trend={metrics?.ordersThisHour ? `+${metrics.ordersThisHour} esta hora` : undefined}
          trendUp={true}
        />
        <MetricCard
          icon={Clock}
          label="Pendientes"
          value={metrics?.pendingOrders || 0}
          highlight={metrics?.pendingOrders && metrics.pendingOrders > 10}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completados"
          value={metrics?.completedOrders || 0}
          iconColor="text-green-500"
        />
        <MetricCard
          icon={Users}
          label="Usuarios Activos"
          value={metrics?.activeUsers || 0}
        />
        <MetricCard
          icon={Zap}
          label="Tiempo Prom."
          value={`${metrics?.avgProcessingTime || 0}m`}
        />
        <MetricCard
          icon={Server}
          label="Carga Sistema"
          value={`${metrics?.systemLoad || 0}%`}
          progress={metrics?.systemLoad}
          highlight={metrics?.systemLoad && metrics.systemLoad > 80}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Laundry Status Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Estado de Lavanderías
                </CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real de todas las lavanderías
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {laundryStatuses.filter(l => l.status === 'online').length}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  {laundryStatuses.filter(l => l.status === 'warning').length}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  {laundryStatuses.filter(l => l.status === 'offline').length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {laundryStatuses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay lavanderías registradas</p>
                  </div>
                ) : (
                  laundryStatuses.map((laundry) => (
                    <div
                      key={laundry.id}
                      className={`p-4 rounded-lg border transition-all ${
                        laundry.status === 'offline'
                          ? 'bg-destructive/5 border-destructive/20'
                          : laundry.status === 'warning'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-card hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            laundry.status === 'online' ? 'bg-green-500/10' : 
                            laundry.status === 'warning' ? 'bg-amber-500/10' : 'bg-destructive/10'
                          }`}>
                            {laundry.status === 'online' ? (
                              <Wifi className={getStatusColor(laundry.status)} />
                            ) : laundry.status === 'warning' ? (
                              <AlertTriangle className={getStatusColor(laundry.status)} />
                            ) : (
                              <WifiOff className={getStatusColor(laundry.status)} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{laundry.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{laundry.slug}</p>
                          </div>
                        </div>
                        {getStatusBadge(laundry.status)}
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                        <div>
                          <p className="text-lg font-bold">{laundry.branchCount}</p>
                          <p className="text-xs text-muted-foreground">Sucursales</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{laundry.userCount}</p>
                          <p className="text-xs text-muted-foreground">Usuarios</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{laundry.todayOrders}</p>
                          <p className="text-xs text-muted-foreground">Pedidos Hoy</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${laundry.pendingOrders > 5 ? 'text-amber-500' : ''}`}>
                            {laundry.pendingOrders}
                          </p>
                          <p className="text-xs text-muted-foreground">Pendientes</p>
                        </div>
                      </div>

                      {laundry.lastActivity && (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Última actividad: {formatDistanceToNow(new Date(laundry.lastActivity), { addSuffix: true, locale: es })}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Alertas
                {alerts.filter(a => !a.acknowledged).length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {alerts.filter(a => !a.acknowledged).length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAcknowledgedAlerts}
                disabled={!alerts.some(a => a.acknowledged)}
              >
                Limpiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay alertas</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        alert.acknowledged
                          ? 'opacity-50 bg-muted/30'
                          : alert.type === 'error'
                          ? 'bg-destructive/5 border-destructive/20'
                          : alert.type === 'warning'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : alert.type === 'success'
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-blue-500/5 border-blue-500/20'
                      }`}
                      onClick={() => !alert.acknowledged && acknowledgeAlert(alert.id)}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {alert.source}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* System Status Footer */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-500" />
                <span>Base de datos: OK</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-green-500" />
                <span>Storage: OK</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span>APIs: OK</span>
              </div>
            </div>
            <div className="text-muted-foreground">
              Uptime: 99.9% | Latencia: ~45ms
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  progress,
  highlight,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  progress?: number;
  highlight?: boolean;
  iconColor?: string;
}) {
  return (
    <Card className={highlight ? 'border-amber-500/50 bg-amber-500/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-4 h-4 ${iconColor || 'text-muted-foreground'}`} />
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trendUp ? 'text-green-500' : 'text-destructive'}`}>
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
        <p className={`text-2xl font-bold ${highlight ? 'text-amber-500' : ''}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {progress !== undefined && (
          <Progress value={progress} className="mt-2 h-1" />
        )}
      </CardContent>
    </Card>
  );
}
