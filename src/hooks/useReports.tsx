import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfYear, endOfMonth, endOfYear, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface ReportFilters {
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
  serviceCategory?: string;
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  avgTicket: number;
}

interface ServiceData {
  name: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

interface EmployeePerformance {
  id: string;
  name: string;
  ordersProcessed: number;
  revenue: number;
  avgTime: number;
}

interface FinancialSummary {
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

interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: { name: string; orders: number; revenue: number }[];
}

interface ReportData {
  salesData: SalesData[];
  serviceData: ServiceData[];
  employeePerformance: EmployeePerformance[];
  financialSummary: FinancialSummary;
  customerStats: CustomerStats;
  periodComparison: {
    currentRevenue: number;
    previousRevenue: number;
    revenueChange: number;
    currentOrders: number;
    previousOrders: number;
    ordersChange: number;
  };
}

const defaultReportData: ReportData = {
  salesData: [],
  serviceData: [],
  employeePerformance: [],
  financialSummary: {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    avgDailyRevenue: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
  },
  customerStats: {
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    topCustomers: [],
  },
  periodComparison: {
    currentRevenue: 0,
    previousRevenue: 0,
    revenueChange: 0,
    currentOrders: 0,
    previousOrders: 0,
    ordersChange: 0,
  },
};

function getDateRange(period: ReportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  
  if (period === 'custom' && customStart && customEnd) {
    const diff = customEnd.getTime() - customStart.getTime();
    return {
      start: customStart,
      end: endOfDay(customEnd),
      prevStart: new Date(customStart.getTime() - diff),
      prevEnd: new Date(customEnd.getTime() - diff),
    };
  }

  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
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
        prevEnd: endOfMonth(subDays(monthStart, 1)),
      };
    case 'quarter':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
      const prevQuarterStart = new Date(now.getFullYear(), quarterMonth - 3, 1);
      return {
        start: quarterStart,
        end: endOfDay(now),
        prevStart: prevQuarterStart,
        prevEnd: new Date(now.getFullYear(), quarterMonth, 0),
      };
    case 'year':
    default:
      const yearStart = startOfYear(now);
      return {
        start: yearStart,
        end: endOfDay(now),
        prevStart: startOfYear(subDays(yearStart, 1)),
        prevEnd: endOfYear(subDays(yearStart, 1)),
      };
  }
}

export function useReports(initialFilters?: Partial<ReportFilters>) {
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'month',
    ...initialFilters,
  });
  const [data, setData] = useState<ReportData>(defaultReportData);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end, prevStart, prevEnd } = getDateRange(
        filters.period,
        filters.startDate,
        filters.endDate
      );

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (ordersError) throw ordersError;

      // Fetch previous period orders
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString());

      // Fetch order items
      const orderIds = orders?.map(o => o.id) || [];
      let orderItems: { order_id: string; name: string; quantity: number; unit_price: number }[] = [];
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('order_id, name, quantity, unit_price')
          .in('order_id', orderIds);
        orderItems = itemsData || [];
      }

      // Fetch cash register for expenses
      const { data: cashEntries } = await supabase
        .from('cash_register')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch employees
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, name');

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*');

      // Process data
      const totalRevenue = cashEntries?.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalExpenses = cashEntries?.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
      
      const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const pendingOrders = orders?.filter(o => !['delivered', 'cancelled'].includes(o.status || '')).length || 0;
      
      // Sales data by date
      const salesByDate: Record<string, { revenue: number; orders: number }> = {};
      
      // Generate date intervals based on period
      let dateIntervals: Date[] = [];
      if (filters.period === 'today') {
        for (let h = 0; h < 24; h++) {
          const d = new Date(start);
          d.setHours(h, 0, 0, 0);
          dateIntervals.push(d);
        }
      } else if (filters.period === 'week') {
        dateIntervals = eachDayOfInterval({ start, end });
      } else if (filters.period === 'month') {
        dateIntervals = eachDayOfInterval({ start, end });
      } else if (filters.period === 'quarter' || filters.period === 'year') {
        dateIntervals = eachMonthOfInterval({ start, end });
      } else {
        dateIntervals = eachDayOfInterval({ start, end });
      }

      dateIntervals.forEach(d => {
        const key = filters.period === 'today' 
          ? format(d, 'HH:00')
          : filters.period === 'quarter' || filters.period === 'year'
            ? format(d, 'MMM', { locale: es })
            : format(d, 'dd/MM');
        salesByDate[key] = { revenue: 0, orders: 0 };
      });

      orders?.forEach(order => {
        const orderDate = new Date(order.created_at || '');
        const key = filters.period === 'today'
          ? format(orderDate, 'HH:00')
          : filters.period === 'quarter' || filters.period === 'year'
            ? format(orderDate, 'MMM', { locale: es })
            : format(orderDate, 'dd/MM');
        
        if (salesByDate[key]) {
          salesByDate[key].orders++;
          salesByDate[key].revenue += Number(order.paid_amount || 0);
        }
      });

      const salesData: SalesData[] = Object.entries(salesByDate).map(([date, vals]) => ({
        date,
        revenue: vals.revenue,
        orders: vals.orders,
        avgTicket: vals.orders > 0 ? vals.revenue / vals.orders : 0,
      }));

      // Service data
      const serviceStats: Record<string, { quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const name = item.name || 'Sin nombre';
        if (!serviceStats[name]) {
          serviceStats[name] = { quantity: 0, revenue: 0 };
        }
        serviceStats[name].quantity += Number(item.quantity);
        serviceStats[name].revenue += Number(item.quantity) * Number(item.unit_price);
      });

      const totalServiceRevenue = Object.values(serviceStats).reduce((sum, s) => sum + s.revenue, 0);
      const serviceData: ServiceData[] = Object.entries(serviceStats)
        .map(([name, vals]) => ({
          name,
          quantity: vals.quantity,
          revenue: vals.revenue,
          percentage: totalServiceRevenue > 0 ? (vals.revenue / totalServiceRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Employee performance
      const employeeStats: Record<string, { ordersProcessed: number; revenue: number }> = {};
      orders?.forEach(order => {
        const empId = order.created_by || 'unknown';
        if (!employeeStats[empId]) {
          employeeStats[empId] = { ordersProcessed: 0, revenue: 0 };
        }
        employeeStats[empId].ordersProcessed++;
        employeeStats[empId].revenue += Number(order.total_amount);
      });

      const employeePerformance: EmployeePerformance[] = Object.entries(employeeStats).map(([id, vals]) => {
        const emp = employeesData?.find(e => e.id === id);
        return {
          id,
          name: emp?.name || 'Desconocido',
          ordersProcessed: vals.ordersProcessed,
          revenue: vals.revenue,
          avgTime: 0,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // Customer stats - use real customer data
      const customerOrderCounts: Record<string, { name: string; orders: number; revenue: number }> = {};
      orders?.forEach(order => {
        const customerId = order.customer_id || order.customer_name;
        if (!customerOrderCounts[customerId]) {
          customerOrderCounts[customerId] = {
            name: order.customer_name,
            orders: 0,
            revenue: 0,
          };
        }
        customerOrderCounts[customerId].orders++;
        customerOrderCounts[customerId].revenue += Number(order.total_amount);
      });

      const topCustomers = Object.values(customerOrderCounts)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get total customers from DB and calculate new/returning
      const totalDbCustomers = customers?.length || 0;
      const customersWithOrdersInPeriod = new Set(orders?.map(o => o.customer_id).filter(Boolean));
      
      // New customers: created within the period
      const newCustomersCount = customers?.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt >= start && createdAt <= end;
      }).length || 0;
      
      // Returning customers: have orders in this period but were created before
      const returningCustomersCount = customers?.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt < start && customersWithOrdersInPeriod.has(c.id);
      }).length || 0;

      // Calculate days in period
      const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      // Set report data
      setData({
        salesData,
        serviceData,
        employeePerformance,
        financialSummary: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
          avgDailyRevenue: totalRevenue / daysInPeriod,
          avgOrderValue: (orders?.length || 0) > 0 ? totalRevenue / (orders?.length || 1) : 0,
          totalOrders: orders?.length || 0,
          completedOrders,
          pendingOrders,
          cancelledOrders: 0, // Status 'cancelled' not in enum
        },
        customerStats: {
          totalCustomers: totalDbCustomers,
          newCustomers: newCustomersCount,
          returningCustomers: returningCustomersCount,
          topCustomers,
        },
        periodComparison: {
          currentRevenue: totalRevenue,
          previousRevenue: prevRevenue,
          revenueChange: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
          currentOrders: orders?.length || 0,
          previousOrders: prevOrders?.length || 0,
          ordersChange: (prevOrders?.length || 0) > 0 
            ? (((orders?.length || 0) - (prevOrders?.length || 0)) / (prevOrders?.length || 1)) * 100 
            : 0,
        },
      });

      // Set employees and categories for filters
      setEmployees(employeesData?.map(e => ({ id: e.id, name: e.name })) || []);
      
      // Get categories from catalog services instead
      const { data: servicesData } = await supabase.from('catalog_services').select('category');
      const uniqueCategories = [...new Set(servicesData?.map(s => s.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);

    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateFilters = (newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    data,
    loading,
    filters,
    updateFilters,
    refetch: fetchReports,
    employees,
    categories,
  };
}
