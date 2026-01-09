import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatus } from '@/types';
import { startOfDay, endOfDay, subDays, startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardStats {
  todayOrders: number;
  todayPendingOrders: number;
  todayRevenue: number;
  dailyGoal: number;
  inProcessOrders: number;
  readyForDelivery: number;
  inTransitOrders: number;
  statusCounts: Record<OrderStatus, number>;
  weeklyRevenue: { day: string; revenue: number; orders: number }[];
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
  todayOrdersTrend: number;
  todayRevenueTrend: number;
}

const defaultStats: DashboardStats = {
  todayOrders: 0,
  todayPendingOrders: 0,
  todayRevenue: 0,
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
  weeklyRevenue: [],
  topServices: [],
  recentOrders: [],
  lowStockItems: [],
  todayOrdersTrend: 0,
  todayRevenueTrend: 0,
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const yesterdayStart = startOfDay(subDays(today, 1)).toISOString();
      const yesterdayEnd = endOfDay(subDays(today, 1)).toISOString();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });

      // Fetch all orders for stats calculation
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, is_paid, paid_amount, customer_name, ticket_code');

      if (ordersError) throw ordersError;

      // Fetch order items for recent orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, name, quantity');

      if (itemsError) throw itemsError;

      // Fetch low stock inventory items
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('name, current_stock, min_stock')
        .lt('current_stock', supabase.rpc ? 100000 : 100000); // Get all, filter below

      if (inventoryError) throw inventoryError;

      // Fetch cash register entries for today
      const { data: cashEntries, error: cashError } = await supabase
        .from('cash_register')
        .select('amount, entry_type, created_at')
        .eq('entry_type', 'income')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      if (cashError) throw cashError;

      // Calculate today's orders
      const todayOrders = allOrders?.filter(o => {
        const createdAt = new Date(o.created_at || '');
        return createdAt >= new Date(todayStart) && createdAt <= new Date(todayEnd);
      }) || [];

      // Calculate yesterday's orders for trend
      const yesterdayOrders = allOrders?.filter(o => {
        const createdAt = new Date(o.created_at || '');
        return createdAt >= new Date(yesterdayStart) && createdAt <= new Date(yesterdayEnd);
      }) || [];

      // Status counts
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

      // In process orders (washing, drying, ironing)
      const inProcessOrders = statusCounts.washing + statusCounts.drying + statusCounts.ironing;

      // Calculate today's revenue from cash register
      const todayRevenue = cashEntries?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      // Calculate yesterday's revenue for trend
      const { data: yesterdayCash } = await supabase
        .from('cash_register')
        .select('amount')
        .eq('entry_type', 'income')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd);

      const yesterdayRevenue = yesterdayCash?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Calculate trends
      const todayOrdersTrend = yesterdayOrders.length > 0
        ? Math.round(((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100)
        : todayOrders.length > 0 ? 100 : 0;

      const todayRevenueTrend = yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : todayRevenue > 0 ? 100 : 0;

      // Weekly revenue data
      const weeklyData: { [key: string]: { revenue: number; orders: number } } = {};
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      // Initialize week days
      for (let i = 0; i < 7; i++) {
        const day = subDays(today, 6 - i);
        const dayKey = format(day, 'yyyy-MM-dd');
        weeklyData[dayKey] = { revenue: 0, orders: 0 };
      }

      // Fill in order data
      allOrders?.forEach(order => {
        const createdAt = new Date(order.created_at || '');
        const dayKey = format(createdAt, 'yyyy-MM-dd');
        if (weeklyData[dayKey]) {
          weeklyData[dayKey].orders++;
          if (order.is_paid) {
            weeklyData[dayKey].revenue += Number(order.total_amount);
          } else if (order.paid_amount) {
            weeklyData[dayKey].revenue += Number(order.paid_amount);
          }
        }
      });

      const weeklyRevenue = Object.entries(weeklyData).map(([date, data]) => ({
        day: dayNames[new Date(date).getDay()],
        revenue: data.revenue,
        orders: data.orders,
      }));

      // Top services from order items
      const serviceCount: { [key: string]: number } = {};
      orderItems?.forEach(item => {
        serviceCount[item.name] = (serviceCount[item.name] || 0) + Number(item.quantity);
      });

      const topServices = Object.entries(serviceCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent orders (last 5)
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

      // Pending orders count
      const pendingStatuses: OrderStatus[] = ['pending_pickup', 'in_store', 'washing', 'drying', 'ironing'];
      const todayPendingOrders = pendingStatuses.reduce((sum, status) => sum + statusCounts[status], 0);

      setStats({
        todayOrders: todayOrders.length,
        todayPendingOrders,
        todayRevenue,
        dailyGoal: 1500,
        inProcessOrders,
        readyForDelivery: statusCounts.ready_delivery,
        inTransitOrders: statusCounts.in_transit,
        statusCounts,
        weeklyRevenue,
        topServices,
        recentOrders,
        lowStockItems,
        todayOrdersTrend,
        todayRevenueTrend,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up real-time subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_register' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
