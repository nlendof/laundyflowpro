import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats, DatePeriod } from '@/hooks/useDashboardStats';
import { StatCard } from '@/components/StatCard';
import { OrderStatusFlow } from '@/components/OrderStatusFlow';
import { StatusBadge } from '@/components/StatusBadge';
import { ORDER_STATUS_CONFIG } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { useConfig } from '@/contexts/ConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  DollarSign,
  TrendingUp,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const PERIOD_LABELS: Record<DatePeriod, string> = {
  today: 'Hoy',
  week: 'Esta Semana',
  month: 'Este Mes',
  year: 'Este Año',
};

const PERIOD_CHART_TITLES: Record<DatePeriod, string> = {
  today: 'Ingresos por Hora',
  week: 'Ingresos Semanales',
  month: 'Ingresos Mensuales',
  year: 'Ingresos Anuales',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DatePeriod>('today');
  const { stats, loading } = useDashboardStats(period);
  const { business } = useConfig();
  const navigate = useNavigate();
  const currency = business.currency;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.name}. Aquí está el resumen de {PERIOD_LABELS[period].toLowerCase()}.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as DatePeriod)}>
            <TabsList>
              <TabsTrigger value="today" className="gap-1">
                <Calendar className="w-3 h-3" />
                Hoy
              </TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="year">Año</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={`Pedidos ${PERIOD_LABELS[period]}`}
          value={stats.periodOrders}
          subtitle={`${stats.periodPendingOrders} pendientes`}
          icon={Package}
          trend={stats.ordersTrend !== 0 ? { 
            value: Math.abs(stats.ordersTrend), 
            isPositive: stats.ordersTrend > 0 
          } : undefined}
          variant="primary"
        />
        <StatCard
          title={`Ingresos ${PERIOD_LABELS[period]}`}
          value={formatCurrency(stats.periodRevenue, currency)}
          subtitle={period === 'today' ? `Meta: ${formatCurrency(stats.dailyGoal, currency)}` : 'Total del período'}
          icon={DollarSign}
          trend={stats.revenueTrend !== 0 ? { 
            value: Math.abs(stats.revenueTrend), 
            isPositive: stats.revenueTrend > 0 
          } : undefined}
          variant="success"
        />
        <StatCard
          title="En Proceso"
          value={stats.inProcessOrders}
          subtitle="Lavando, secando, planchando"
          icon={TrendingUp}
          variant="info"
        />
        <StatCard
          title="Listos para Entrega"
          value={stats.readyForDelivery}
          subtitle={`${stats.inTransitOrders} en camino`}
          icon={Truck}
          variant="warning"
        />
      </div>

      {/* Order Status Overview */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">Estado de Pedidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
            <div
              key={key}
              className={`${config.bgColor} rounded-xl p-4 text-center transition-all hover:scale-105 cursor-pointer`}
              onClick={() => navigate('/orders')}
            >
              <p className={`text-2xl font-bold ${config.color}`}>
                {stats.statusCounts[key as keyof typeof stats.statusCounts] || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {config.labelEs}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">{PERIOD_CHART_TITLES[period]}</h2>
          <div className="h-[300px]">
            {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value, currency), 'Ingresos']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay datos de ingresos en este período
              </div>
            )}
          </div>
        </div>

        {/* Top Services Chart */}
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Servicios Más Solicitados</h2>
          <div className="h-[300px]">
            {stats.topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay datos de servicios en este período
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Pedidos Recientes</h2>
          <button 
            className="text-sm text-primary hover:underline"
            onClick={() => navigate('/orders')}
          >
            Ver todos
          </button>
        </div>
        <div className="overflow-x-auto">
          {stats.recentOrders.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Pedido
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Prendas
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/orders')}
                  >
                    <td className="py-4 px-4">
                      <span className="font-medium font-mono">{order.ticketCode}</span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{order.customer}</td>
                    <td className="py-4 px-4 text-muted-foreground">{order.items} prendas</td>
                    <td className="py-4 px-4">
                      <StatusBadge status={order.status} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right font-semibold">
                      {formatCurrency(order.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay pedidos recientes
            </div>
          )}
        </div>
      </div>

      {/* Order Flow Example */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">Flujo de Pedido</h2>
        <OrderStatusFlow currentStatus={stats.recentOrders[0]?.status || 'in_store'} />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.lowStockItems.length > 0 ? (
          <div className="bg-status-pending-bg border border-status-pending/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-status-pending/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-status-pending" />
              </div>
              <div>
                <h3 className="font-semibold text-status-pending">Stock Bajo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.lowStockItems.map(item => item.name).join(', ')} están por debajo del mínimo.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-status-delivered-bg border border-status-delivered/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-status-delivered/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-status-delivered" />
              </div>
              <div>
                <h3 className="font-semibold text-status-delivered">Inventario OK</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Todos los productos están por encima del stock mínimo.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {period === 'today' && stats.periodRevenue >= stats.dailyGoal ? (
          <div className="bg-status-delivered-bg border border-status-delivered/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-status-delivered/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-status-delivered" />
              </div>
              <div>
                <h3 className="font-semibold text-status-delivered">¡Meta Alcanzada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Felicidades, se superó la meta de ingresos del día ({formatCurrency(stats.dailyGoal, currency)}).
                </p>
              </div>
            </div>
          </div>
        ) : period === 'today' ? (
          <div className="bg-muted/50 border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Progreso de Meta</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(stats.periodRevenue, currency)} de {formatCurrency(stats.dailyGoal, currency)} ({Math.round((stats.periodRevenue / stats.dailyGoal) * 100)}%)
                </p>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.periodRevenue / stats.dailyGoal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Resumen del Período</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.periodOrders} pedidos con ingresos de {formatCurrency(stats.periodRevenue, currency)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}