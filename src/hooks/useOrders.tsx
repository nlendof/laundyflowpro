import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, OrderItem, ItemType } from '@/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Package } from 'lucide-react';
import { playNotificationSound } from '@/lib/notificationSound';
import { notifyNewOrder, notifyOrderStatusChange, getNotificationPermission } from '@/lib/pushNotifications';

type DbOrder = Tables<'orders'>;
type DbOrderItem = Tables<'order_items'>;

// Convert database order to frontend Order type
const mapDbOrderToOrder = (dbOrder: DbOrder, dbItems: DbOrderItem[]): Order => {
  const items: OrderItem[] = dbItems.map(item => ({
    id: item.id,
    name: item.name,
    type: item.item_type as ItemType,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    extras: Array.isArray(item.extras) ? (item.extras as string[]) : [],
  }));

  return {
    id: dbOrder.id,
    ticketCode: dbOrder.ticket_code,
    qrCode: dbOrder.qr_code || dbOrder.ticket_code,
    customerId: dbOrder.customer_id || '',
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone || '',
    customerAddress: dbOrder.customer_address || undefined,
    items,
    status: (dbOrder.status || 'in_store') as OrderStatus,
    totalAmount: dbOrder.total_amount,
    discountAmount: (dbOrder as any).discount_amount || 0,
    paidAmount: dbOrder.paid_amount || 0,
    isPaid: dbOrder.is_paid || false,
    isDelivery: dbOrder.needs_delivery || false,
    deliverySlot: dbOrder.delivery_slot as 'morning' | 'afternoon' | undefined,
    deliveryDriverId: dbOrder.delivery_driver_id || undefined,
    needsPickup: dbOrder.needs_pickup || false,
    needsDelivery: dbOrder.needs_delivery || false,
    pickupService: dbOrder.needs_pickup ? {
      type: 'pickup',
      status: dbOrder.pickup_completed_at ? 'completed' : 'pending',
      address: dbOrder.pickup_address || dbOrder.customer_address || '',
      scheduledSlot: dbOrder.pickup_slot as 'morning' | 'afternoon' | undefined,
      completedAt: dbOrder.pickup_completed_at ? new Date(dbOrder.pickup_completed_at) : undefined,
      driverId: dbOrder.pickup_driver_id || undefined,
    } : undefined,
    deliveryService: dbOrder.needs_delivery ? {
      type: 'delivery',
      status: dbOrder.delivery_completed_at ? 'completed' : 'pending',
      address: dbOrder.delivery_address || dbOrder.customer_address || '',
      scheduledSlot: dbOrder.delivery_slot as 'morning' | 'afternoon' | undefined,
      completedAt: dbOrder.delivery_completed_at ? new Date(dbOrder.delivery_completed_at) : undefined,
      driverId: dbOrder.delivery_driver_id || undefined,
    } : undefined,
    createdAt: new Date(dbOrder.created_at || new Date()),
    updatedAt: new Date(dbOrder.updated_at || new Date()),
    estimatedReadyAt: dbOrder.estimated_ready_at ? new Date(dbOrder.estimated_ready_at) : undefined,
    deliveredAt: dbOrder.delivered_at ? new Date(dbOrder.delivered_at) : undefined,
    notes: dbOrder.notes || undefined,
  };
};

export function useOrders(options?: { onNewOrder?: () => void }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const onNewOrderRef = useRef(options?.onNewOrder);

  // Fetch all orders with their items
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch all order items
      const orderIds = ordersData.map(o => o.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Group items by order_id
      const itemsByOrderId = (itemsData || []).reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {} as Record<string, DbOrderItem[]>);

      // Map to frontend Order type
      const mappedOrders = ordersData.map(order => 
        mapDbOrderToOrder(order, itemsByOrderId[order.id] || [])
      );

      setOrders(mappedOrders);
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new order
  const createOrder = useCallback(async (orderData: Omit<Order, 'id' | 'ticketCode' | 'qrCode' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Insert order (ticket_code is generated by trigger)
      const orderInsert: Record<string, any> = {
        ticket_code: 'TEMP', // Will be overwritten by trigger
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_address: orderData.customerAddress,
        customer_id: orderData.customerId || null,
        status: orderData.status,
        total_amount: orderData.totalAmount,
        discount_amount: orderData.discountAmount || 0,
        paid_amount: orderData.paidAmount,
        is_paid: orderData.isPaid,
        needs_pickup: orderData.needsPickup,
        needs_delivery: orderData.needsDelivery,
        pickup_address: orderData.pickupService?.address,
        pickup_slot: orderData.pickupService?.scheduledSlot,
        pickup_cost: 0,
        delivery_address: orderData.deliveryService?.address,
        delivery_slot: orderData.deliveryService?.scheduledSlot,
        delivery_cost: 0,
        estimated_ready_at: orderData.estimatedReadyAt?.toISOString(),
        notes: orderData.notes,
        created_by: user?.id,
        item_checks: {},
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsert as any)
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (orderData.items.length > 0) {
        const itemsInsert: TablesInsert<'order_items'>[] = orderData.items.map(item => ({
          order_id: newOrder.id,
          name: item.name,
          item_type: item.type as 'weight' | 'piece',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          extras: item.extras,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsInsert);

        if (itemsError) throw itemsError;
      }

      // Refresh orders
      await fetchOrders();

      // Return the created order for QR display
      const createdOrder = mapDbOrderToOrder(newOrder, orderData.items.map((item, idx) => ({
        id: `temp-${idx}`,
        order_id: newOrder.id,
        name: item.name,
        item_type: item.type as 'weight' | 'piece',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        extras: item.extras,
        created_at: new Date().toISOString(),
        service_id: null,
        article_id: null,
      })));

      return createdOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear el pedido');
      throw error;
    }
  }, [user, fetchOrders]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updates: Partial<TablesInsert<'orders'>> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add delivered_at if status is delivered
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date() }
          : order
      ));

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado');
      return false;
    }
  }, []);

  // Update order payment
  const updateOrderPayment = useCallback(async (orderId: string, paidAmount: number, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          paid_amount: paidAmount,
          is_paid: isPaid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, paidAmount, isPaid, updatedAt: new Date() }
          : order
      ));

      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Error al actualizar el pago');
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle real-time order updates efficiently
  const handleRealtimeUpdate = useCallback(async (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: DbOrder | null;
    old: { id: string } | null;
  }) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'DELETE' && oldRecord) {
      setOrders(prev => prev.filter(order => order.id !== oldRecord.id));
      return;
    }

    if (!newRecord) return;

    // Fetch items for this order
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', newRecord.id);

    const mappedOrder = mapDbOrderToOrder(newRecord, itemsData || []);

    if (eventType === 'INSERT') {
      setOrders(prev => [mappedOrder, ...prev]);
      
      // Show toast notification for new orders (not on initial load)
      if (!isInitialLoadRef.current) {
        // Add to highlighted orders
        setNewOrderIds(prev => new Set(prev).add(mappedOrder.id));
        
        // Auto-remove highlight after 5 seconds
        setTimeout(() => {
          setNewOrderIds(prev => {
            const next = new Set(prev);
            next.delete(mappedOrder.id);
            return next;
          });
        }, 5000);
        
        // Play notification sound
        playNotificationSound();
        
        // Send push notification if permission granted
        if (getNotificationPermission() === 'granted') {
          notifyNewOrder(mappedOrder.ticketCode, mappedOrder.customerName);
        }
        
        // Trigger callback for external listeners (e.g., sidebar badge)
        onNewOrderRef.current?.();
        
        // Show toast notification
        toast.success(`Nuevo pedido: ${mappedOrder.ticketCode}`, {
          description: `Cliente: ${mappedOrder.customerName}`,
          icon: <Package className="w-4 h-4" />,
          duration: 5000,
        });
      }
    } else if (eventType === 'UPDATE') {
      // Check if status changed for push notification
      const oldOrder = orders.find(o => o.id === newRecord.id);
      if (oldOrder && oldOrder.status !== mappedOrder.status) {
        // Send push notification for status change if permission granted
        if (getNotificationPermission() === 'granted') {
          notifyOrderStatusChange(
            mappedOrder.ticketCode,
            mappedOrder.customerName,
            mappedOrder.status
          );
        }
      }
      
      setOrders(prev => prev.map(order => 
        order.id === newRecord.id ? mappedOrder : order
      ));
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          handleRealtimeUpdate({
            eventType: 'INSERT',
            new: payload.new as DbOrder,
            old: null,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          handleRealtimeUpdate({
            eventType: 'UPDATE',
            new: payload.new as DbOrder,
            old: payload.old as { id: string },
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          handleRealtimeUpdate({
            eventType: 'DELETE',
            new: null,
            old: payload.old as { id: string },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeUpdate]);

  return {
    orders,
    loading,
    newOrderIds,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    updateOrderPayment,
  };
}
