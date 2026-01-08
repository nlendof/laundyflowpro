import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/StatCard';
import { OrderStatusFlow } from '@/components/OrderStatusFlow';
import { StatusBadge } from '@/components/StatusBadge';
import { ORDER_STATUS_CONFIG } from '@/lib/constants';
import { OrderStatus } from '@/types';
import {
  Package,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
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

// Mock data
const weeklyRevenue = [
  { day: 'Lun', revenue: 850, orders: 23 },
  { day: 'Mar', revenue: 1200, orders: 31 },
  { day: 'Mié', revenue: 980, orders: 28 },
  { day: 'Jue', revenue: 1450, orders: 38 },
  { day: 'Vie', revenue: 1680, orders: 42 },
  { day: 'Sáb', revenue: 2100, orders: 55 },
  { day: 'Dom', revenue: 890, orders: 21 },
];

const topServices = [
  { name: 'Lavado + Secado', count: 145 },
  { name: 'Lavado Completo', count: 98 },
  { name: 'Lavado en Seco', count: 67 },
  { name: 'Planchado', count: 54 },
  { name: 'Express', count: 32 },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'María García', status: 'washing' as OrderStatus, amount: 45.00, items: 8 },
  { id: 'ORD-002', customer: 'Juan Pérez', status: 'ready_delivery' as OrderStatus, amount: 32.50, items: 5 },
  { id: 'ORD-003', customer: 'Ana López', status: 'in_transit' as OrderStatus, amount: 67.00, items: 12 },
  { id: 'ORD-004', customer: 'Carlos Ruiz', status: 'pending_pickup' as OrderStatus, amount: 28.00, items: 4 },
  { id: 'ORD-005', customer: 'Laura Sánchez', status: 'drying' as OrderStatus, amount: 55.00, items: 9 },
];

const statusCounts: Record<string, number> = {
  pending_pickup: 8,
  in_store: 5,
  washing: 12,
  drying: 7,
  ironing: 4,
  ready_delivery: 15,
  in_transit: 6,
  delivered: 89,
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.name}. Aquí está el resumen de hoy.
          </p>
        </div>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pedidos Hoy"
          value={47}
          subtitle="12 pendientes"
          icon={Package}
          trend={{ value: 12, isPositive: true }}
          variant="primary"
        />
        <StatCard
          title="Ingresos del Día"
          value="$1,250"
          subtitle="Meta: $1,500"
          icon={DollarSign}
          trend={{ value: 8, isPositive: true }}
          variant="success"
        />
        <StatCard
          title="En Proceso"
          value={28}
          subtitle="Lavando, secando, planchando"
          icon={TrendingUp}
          variant="info"
        />
        <StatCard
          title="Listos para Entrega"
          value={15}
          subtitle="6 en camino"
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
              className={`${config.bgColor} rounded-xl p-4 text-center transition-all hover:scale-105`}
            >
              <p className={`text-2xl font-bold ${config.color}`}>
                {statusCounts[key] || 0}
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
        {/* Weekly Revenue Chart */}
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Ingresos Semanales</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyRevenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value}`, 'Ingresos']}
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
          </div>
        </div>

        {/* Top Services Chart */}
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Servicios Más Solicitados</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topServices} layout="vertical">
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
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Pedidos Recientes</h2>
          <button className="text-sm text-primary hover:underline">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
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
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-medium">{order.id}</span>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">{order.customer}</td>
                  <td className="py-4 px-4 text-muted-foreground">{order.items} prendas</td>
                  <td className="py-4 px-4">
                    <StatusBadge status={order.status} size="sm" />
                  </td>
                  <td className="py-4 px-4 text-right font-semibold">
                    ${order.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Flow Example */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">Flujo de Pedido (Ejemplo)</h2>
        <OrderStatusFlow currentStatus="drying" />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-status-pending-bg border border-status-pending/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-status-pending/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-status-pending" />
            </div>
            <div>
              <h3 className="font-semibold text-status-pending">Stock Bajo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Detergente Premium y Suavizante Floral están por debajo del mínimo.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-status-delivered-bg border border-status-delivered/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-status-delivered/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-status-delivered" />
            </div>
            <div>
              <h3 className="font-semibold text-status-delivered">Meta Alcanzada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ¡Felicidades! Se superó la meta de entregas del día.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
