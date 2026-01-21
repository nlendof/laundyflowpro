import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBranchFilter } from '@/contexts/LaundryContext';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  status: 'available' | 'delivering' | 'offline';
  currentOrders: number;
  completedToday: number;
  zone: string;
  isActive: boolean;
}

export function useDrivers() {
  const { laundryId } = useBranchFilter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);

      // Get users with delivery role that belong to the current laundry
      const { data: deliveryRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'delivery');

      if (rolesError) throw rolesError;

      if (!deliveryRoles || deliveryRoles.length === 0) {
        setDrivers([]);
        return;
      }

      const driverUserIds = deliveryRoles.map(r => r.user_id);

      // Get profiles for delivery users - filter by laundry_id
      let profilesQuery = supabase
        .from('profiles')
        .select('id, name, phone, avatar_url, is_active, laundry_id')
        .in('id', driverUserIds);

      // Filter by laundry_id if available
      if (laundryId) {
        profilesQuery = profilesQuery.eq('laundry_id', laundryId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Get today's completed deliveries count per driver
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: completedOrders } = await supabase
        .from('orders')
        .select('delivery_driver_id, pickup_driver_id')
        .or(`delivery_completed_at.gte.${today.toISOString()},pickup_completed_at.gte.${today.toISOString()}`);

      // Get current active orders per driver
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('delivery_driver_id, pickup_driver_id, status')
        .in('status', ['in_transit', 'pending_pickup'])
        .or('delivery_driver_id.not.is.null,pickup_driver_id.not.is.null');

      // Count completions and active orders
      const completedCountByDriver: Record<string, number> = {};
      const activeCountByDriver: Record<string, number> = {};

      completedOrders?.forEach(order => {
        if (order.delivery_driver_id) {
          completedCountByDriver[order.delivery_driver_id] = (completedCountByDriver[order.delivery_driver_id] || 0) + 1;
        }
        if (order.pickup_driver_id) {
          completedCountByDriver[order.pickup_driver_id] = (completedCountByDriver[order.pickup_driver_id] || 0) + 1;
        }
      });

      activeOrders?.forEach(order => {
        if (order.delivery_driver_id) {
          activeCountByDriver[order.delivery_driver_id] = (activeCountByDriver[order.delivery_driver_id] || 0) + 1;
        }
        if (order.pickup_driver_id) {
          activeCountByDriver[order.pickup_driver_id] = (activeCountByDriver[order.pickup_driver_id] || 0) + 1;
        }
      });

      // Map to Driver interface
      const mappedDrivers: Driver[] = (profiles || []).map(profile => {
        const currentOrders = activeCountByDriver[profile.id] || 0;
        const completedToday = completedCountByDriver[profile.id] || 0;
        
        let status: Driver['status'] = 'available';
        if (!profile.is_active) {
          status = 'offline';
        } else if (currentOrders > 0) {
          status = 'delivering';
        }

        // Generate avatar emoji based on name
        const avatarEmojis = ['🚗', '🏍️', '🛵', '🚚', '🚐', '🚙'];
        const avatarIndex = profile.name.charCodeAt(0) % avatarEmojis.length;

        return {
          id: profile.id,
          name: profile.name,
          phone: profile.phone || '',
          avatar: avatarEmojis[avatarIndex],
          status,
          currentOrders,
          completedToday,
          zone: '', // Could be extended with zone assignment
          isActive: profile.is_active ?? true,
        };
      });

      setDrivers(mappedDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Error al cargar los repartidores');
    } finally {
      setLoading(false);
    }
  }, [laundryId]);

  // Assign driver to pickup - changes status to "on_way_to_store"
  const assignPickupDriver = useCallback(async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          pickup_driver_id: driverId,
          status: 'pending_pickup', // Keep in pending_pickup, but driver is on the way
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchDrivers();
      return true;
    } catch (error) {
      console.error('Error assigning pickup driver:', error);
      toast.error('Error al asignar repartidor');
      return false;
    }
  }, [fetchDrivers]);

  // Assign driver to delivery - changes status to "in_transit"
  const assignDeliveryDriver = useCallback(async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_driver_id: driverId,
          status: 'in_transit',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchDrivers();
      return true;
    } catch (error) {
      console.error('Error assigning delivery driver:', error);
      toast.error('Error al asignar repartidor');
      return false;
    }
  }, [fetchDrivers]);

  // Complete pickup
  const completePickup = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          pickup_completed_at: new Date().toISOString(),
          status: 'in_store',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchDrivers();
      return true;
    } catch (error) {
      console.error('Error completing pickup:', error);
      toast.error('Error al completar recogida');
      return false;
    }
  }, [fetchDrivers]);

  // Complete delivery
  const completeDelivery = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_completed_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchDrivers();
      return true;
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Error al completar entrega');
      return false;
    }
  }, [fetchDrivers]);

  // Start pickup (update status to in_progress)
  const startPickup = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'pending_pickup',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error starting pickup:', error);
      toast.error('Error al iniciar recogida');
      return false;
    }
  }, []);

  // Start delivery (update status to in_transit)
  const startDelivery = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'in_transit',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error starting delivery:', error);
      toast.error('Error al iniciar entrega');
      return false;
    }
  }, []);

  // Re-fetch when laundryId changes
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers, laundryId]);

  // Real-time subscription for orders changes
  useEffect(() => {
    const channel = supabase
      .channel('drivers-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDrivers]);

  return {
    drivers,
    loading,
    fetchDrivers,
    assignPickupDriver,
    assignDeliveryDriver,
    completePickup,
    completeDelivery,
    startPickup,
    startDelivery,
  };
}
