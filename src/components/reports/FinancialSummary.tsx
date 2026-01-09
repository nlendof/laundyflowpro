import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { useConfig } from '@/contexts/ConfigContext';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Ban, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummaryData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgDailyRevenue: number;
  avgOrderValue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

interface PeriodComparison {
  currentRevenue: number;
  previousRevenue: number;
  revenueChange: number;
  currentOrders: number;
  previousOrders: number;
  ordersChange: number;
}

interface FinancialSummaryProps {
  data: FinancialSummaryData;
  comparison: PeriodComparison;
  loading?: boolean;
}

export function FinancialSummary({ data, comparison, loading }: FinancialSummaryProps) {
  const { business } = useConfig();

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-emerald-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-emerald-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(data.totalRevenue, business.currency),
      change: comparison.revenueChange,
      icon: DollarSign,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
    },
    {
      title: 'Gastos Totales',
      value: formatCurrency(data.totalExpenses, business.currency),
      change: 0,
      icon: TrendingDown,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-500/10',
    },
    {
      title: 'Utilidad Neta',
      value: formatCurrency(data.netProfit, business.currency),
      subtitle: `${data.profitMargin.toFixed(1)}% margen`,
      icon: data.netProfit >= 0 ? TrendingUp : TrendingDown,
      iconColor: data.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
      iconBg: data.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Ticket Promedio',
      value: formatCurrency(data.avgOrderValue, business.currency),
      subtitle: `${formatCurrency(data.avgDailyRevenue, business.currency)}/día`,
      icon: ShoppingCart,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
    },
  ];

  const orderStats = [
    {
      title: 'Total Órdenes',
      value: data.totalOrders,
      change: comparison.ordersChange,
      icon: Package,
      iconColor: 'text-primary',
    },
    {
      title: 'Completadas',
      value: data.completedOrders,
      icon: Package,
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Pendientes',
      value: data.pendingOrders,
      icon: Package,
      iconColor: 'text-amber-500',
    },
    {
      title: 'Canceladas',
      value: data.cancelledOrders,
      icon: Ban,
      iconColor: 'text-red-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main financial cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  )}
                  {card.change !== undefined && card.change !== 0 && (
                    <div className={cn('flex items-center gap-1 text-sm', getTrendColor(card.change))}>
                      <TrendIcon value={card.change} />
                      <span>{Math.abs(card.change).toFixed(1)}%</span>
                      <span className="text-muted-foreground">vs período anterior</span>
                    </div>
                  )}
                </div>
                <div className={cn('p-3 rounded-full', card.iconBg)}>
                  <card.icon className={cn('h-5 w-5', card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {orderStats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-muted/50">
                <stat.icon className={cn('h-6 w-6 mx-auto mb-2', stat.iconColor)} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                {stat.change !== undefined && stat.change !== 0 && (
                  <div className={cn('flex items-center justify-center gap-1 text-xs mt-1', getTrendColor(stat.change))}>
                    <TrendIcon value={stat.change} />
                    <span>{Math.abs(stat.change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
