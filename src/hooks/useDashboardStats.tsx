import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatus } from '@/types';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBranchFilter } from '@/contexts/LaundryContext';

export type DatePeriod = 'today' | 'week' | 'month' | 'year';

interface DashboardStats {
  periodOrders: number;
  periodPendingOrders: number;
  periodRevenue: number;
  dailyGoal: number;
  inProcessOrders: number;
  readyForDelivery: number;
  inTransitOrders: number;
  statusCounts: Record<OrderStatus, number>;
  chartData: { label: string; revenue: number; orders: number }[];
  topServices: { name: string; count: number }[];
  recentOrders: {
    id: string;
    ticketCode: string;
    customer: string;
    status: OrderStatus;
    amount: number;
    items: number;
  }[];
  lowStockItems: { name: string; current: number; min: number }[];
  ordersTrend: number;
  revenueTrend: number;
}

const defaultStats: DashboardStats = {
  periodOrders: 0,
  periodPendingOrders: 0,
  periodRevenue: 0,
  dailyGoal: 1500,
  inProcessOrders: 0,
  readyForDelivery: 0,
  inTransitOrders: 0,
  statusCounts: {
    pending_pickup: 0,
    in_store: 0,
    washing: 0,
    drying: 0,
    ironing: 0,
    ready_delivery: 0,
    in_transit: 0,
    delivered: 0,
  },
  chartData: [],
  topServices: [],
  recentOrders: [],
  lowStockItems: [],
  ordersTrend: 0,
  revenueTrend: 0,
};

function getDateRange(period: DatePeriod): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const today = startOfDay(now);
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: endOfDay(now),
        prevStart: startOfDay(subDays(now, 1)),
        prevEnd: endOfDay(subDays(now, 1)),
      };
    case 'week':
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      return {
        start: weekStart,
        end: endOfDay(now),
        prevStart: subDays(weekStart, 7),
        prevEnd: subDays(weekStart, 1),
      };
    case 'month':
      const monthStart = startOfMonth(now);
      return {
        start: monthStart,
        end: endOfDay(now),
        prevStart: startOfMonth(subDays(monthStart, 1)),
        prevEnd: subDays(monthStart, 1),
      };
    case 'year':
      const yearStart = startOfYear(now);
      return {
        start: yearStart,
        end: endOfDay(now),
        prevStart: startOfYear(subDays(yearStart, 1)),
        prevEnd: subDays(yearStart, 1),
      };
  }
}

export function useDashboardStats(period: DatePeriod = 'today') {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const { laundryId, branchId } = useBranchFilter();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end, prevStart, prevEnd } = getDateRange(period);
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const prevStartISO = prevStart.toISOString();
      const prevEndISO = prevEnd.toISOString();

      // Build orders query with filters
      let ordersQuery = supabase
        .from('orders')
        .select('id, status, total_amount, created_at, is_paid, paid_amount, customer_name, ticket_code, laundry_id, branch_id');

      if (laundryId) {
        ordersQuery = ordersQuery.eq('laundry_id', laundryId);
      }
      if (branchId) {
        ordersQuery = ordersQuery.eq('branch_id', branchId);
      }

      const { data: allOrders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Fetch order items
      const orderIds = allOrders?.map(o => o.id) || [];
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, name, quantity')
        .in('order_id', orderIds.length > 0 ? orderIds : ['_none_']);

      if (itemsError) throw itemsError;

      // Build inventory query with filter
      let inventoryQuery = supabase
        .from('inventory')
        .select('name, current_stock, min_stock');

      if (laundryId) {
        inventoryQuery = inventoryQuery.eq('laundry_id', laundryId);
      }

      const { data: inventory, error: inventoryError } = await inventoryQuery;

      if (inventoryError) throw inventoryError;

      // Filter orders by period
      const periodOrders = allOrders?.filter(o => {
        const createdAt = new Date(o.created_at || '');
        return createdAt >= start && createdAt <= end;
      }) || [];

      // Previous period orders for trend
      const prevPeriodOrders = allOrders?.filter(o => {
        const createdAt = new Date(o.created_at || '');
        return createdAt >= prevStart && createdAt <= prevEnd;
      }) || [];

      // Fetch cash register entries for current period with filters
      let cashQuery = supabase
        .from('cash_register')
        .select('amount, entry_type, created_at')
        .eq('entry_type', 'income')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (laundryId) {
        cashQuery = cashQuery.eq('laundry_id', laundryId);
      }

      const { data: cashEntries } = await cashQuery;

      // Fetch cash register for previous period
      let prevCashQuery = supabase
        .from('cash_register')
        .select('amount')
        .eq('entry_type', 'income')
        .gte('created_at', prevStartISO)
        .lte('created_at', prevEndISO);

      if (laundryId) {
        prevCashQuery = prevCashQuery.eq('laundry_id', laundryId);
      }

      const { data: prevCashEntries } = await prevCashQuery;

      // Status counts (all time, for overview)
      const statusCounts: Record<OrderStatus, number> = {
        pending_pickup: 0,
        in_store: 0,
        washing: 0,
        drying: 0,
        ironing: 0,
        ready_delivery: 0,
        in_transit: 0,
        delivered: 0,
      };

      allOrders?.forEach(order => {
        const status = order.status as OrderStatus;
        if (status && statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }
      });

      const inProcessOrders = statusCounts.washing + statusCounts.drying + statusCounts.ironing;

      // Calculate revenues
      const periodRevenue = cashEntries?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const prevRevenue = prevCashEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Calculate trends
      const ordersTrend = prevPeriodOrders.length > 0
        ? Math.round(((periodOrders.length - prevPeriodOrders.length) / prevPeriodOrders.length) * 100)
        : periodOrders.length > 0 ? 100 : 0;

      const revenueTrend = prevRevenue > 0
        ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100)
        : periodRevenue > 0 ? 100 : 0;

      // Build chart data based on period
      const chartData = buildChartData(period, allOrders || [], start, end);

      // Top services
      const serviceCount: { [key: string]: number } = {};
      const periodOrderIds = new Set(periodOrders.map(o => o.id));
      orderItems?.filter(item => periodOrderIds.has(item.order_id)).forEach(item => {
        serviceCount[item.name] = (serviceCount[item.name] || 0) + Number(item.quantity);
      });

      const topServices = Object.entries(serviceCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent orders
      const itemCountByOrder: { [orderId: string]: number } = {};
      orderItems?.forEach(item => {
        itemCountByOrder[item.order_id] = (itemCountByOrder[item.order_id] || 0) + Number(item.quantity);
      });

      const recentOrders = (allOrders || [])
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 5)
        .map(order => ({
          id: order.id,
          ticketCode: order.ticket_code,
          customer: order.customer_name,
          status: order.status as OrderStatus,
          amount: Number(order.total_amount),
          items: itemCountByOrder[order.id] || 0,
        }));

      // Low stock items
      const lowStockItems = (inventory || [])
        .filter(item => Number(item.current_stock) < Number(item.min_stock))
        .map(item => ({
          name: item.name,
          current: Number(item.current_stock),
          min: Number(item.min_stock),
        }));

      // Pending counts
      const pendingStatuses: OrderStatus[] = ['pending_pickup', 'in_store', 'washing', 'drying', 'ironing'];
      const periodPendingOrders = pendingStatuses.reduce((sum, status) => sum + statusCounts[status], 0);

      setStats({
        periodOrders: periodOrders.length,
        periodPendingOrders,
        periodRevenue,
        dailyGoal: 1500,
        inProcessOrders,
        readyForDelivery: statusCounts.ready_delivery,
        inTransitOrders: statusCounts.in_transit,
        statusCounts,
        chartData,
        topServices,
        recentOrders,
        lowStockItems,
        ordersTrend,
        revenueTrend,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period, laundryId, branchId]);

function buildChartData(
  period: DatePeriod,
  orders: { created_at: string | null; total_amount: number; is_paid: boolean | null; paid_amount: number | null }[],
  start: Date,
  end: Date
): { label: string; revenue: number; orders: number }[] {
  const data: { [key: string]: { revenue: number; orders: number } } = {};
  const now = new Date();

  if (period === 'today') {
    // Hourly for today
    for (let h = 0; h < 24; h++) {
      data[`${h.toString().padStart(2, '0')}:00`] = { revenue: 0, orders: 0 };
    }
    orders.forEach(order => {
      const createdAt = new Date(order.created_at || '');
      if (createdAt >= start && createdAt <= end) {
        const hour = `${createdAt.getHours().toString().padStart(2, '0')}:00`;
        if (data[hour]) {
          data[hour].orders++;
          data[hour].revenue += order.is_paid ? Number(order.total_amount) : Number(order.paid_amount || 0);
        }
      }
    });
  } else if (period === 'week') {
    // Daily for week
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 7; i++) {
      const day = subDays(now, 6 - i);
      data[format(day, 'yyyy-MM-dd')] = { revenue: 0, orders: 0 };
    }
    orders.forEach(order => {
      const createdAt = new Date(order.created_at || '');
      const key = format(createdAt, 'yyyy-MM-dd');
      if (data[key]) {
        data[key].orders++;
        data[key].revenue += order.is_paid ? Number(order.total_amount) : Number(order.paid_amount || 0);
      }
    });
    return Object.entries(data).map(([date, vals]) => ({
      label: dayNames[new Date(date).getDay()],
      ...vals,
    }));
  } else if (period === 'month') {
    // Weekly for month
    for (let w = 0; w < 5; w++) {
      data[`Sem ${w + 1}`] = { revenue: 0, orders: 0 };
    }
    orders.forEach(order => {
      const createdAt = new Date(order.created_at || '');
      if (createdAt >= start && createdAt <= end) {
        const weekNum = Math.min(Math.floor((createdAt.getDate() - 1) / 7), 4);
        const key = `Sem ${weekNum + 1}`;
        data[key].orders++;
        data[key].revenue += order.is_paid ? Number(order.total_amount) : Number(order.paid_amount || 0);
      }
    });
  } else {
    // Monthly for year
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    monthNames.forEach(m => {
      data[m] = { revenue: 0, orders: 0 };
    });
    orders.forEach(order => {
      const createdAt = new Date(order.created_at || '');
      if (createdAt >= start && createdAt <= end) {
        const month = monthNames[createdAt.getMonth()];
        data[month].orders++;
        data[month].revenue += order.is_paid ? Number(order.total_amount) : Number(order.paid_amount || 0);
      }
    });
  }

  return Object.entries(data).map(([label, vals]) => ({ label, ...vals }));
}

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_register' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
