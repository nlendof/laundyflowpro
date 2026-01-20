import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InventoryItem } from '@/types';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { useBranchFilter } from '@/contexts/LaundryContext';

type DbInventory = Tables<'inventory'>;

interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  criticalCount: number;
  totalValue: number;
  healthyItems: number;
}

export function useInventory() {
  const { user } = useAuth();
  const { laundryId } = useBranchFilter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('inventory')
        .select('*')
        .order('name');

      if (laundryId) {
        query = query.eq('laundry_id', laundryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: InventoryItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category as InventoryItem['category'],
        currentStock: Number(item.current_stock),
        minStock: Number(item.min_stock),
        unit: item.unit,
        unitCost: Number(item.unit_cost) || 0,
        lastRestocked: new Date(item.last_restocked || item.created_at || new Date()),
      }));

      setItems(mapped);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, [laundryId]);

  // Calculate stats
  const stats = useMemo<InventoryStats>(() => {
    const lowStockItems = items.filter(i => i.currentStock < i.minStock);
    const totalValue = items.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0);
    const criticalItems = items.filter(i => i.currentStock < i.minStock * 0.5);

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      criticalCount: criticalItems.length,
      totalValue,
      healthyItems: items.length - lowStockItems.length,
    };
  }, [items]);

  // Add item
  const addItem = useCallback(async (itemData: Omit<InventoryItem, 'id' | 'lastRestocked'>) => {
    try {
      const insert: TablesInsert<'inventory'> = {
        name: itemData.name,
        category: itemData.category,
        current_stock: itemData.currentStock,
        min_stock: itemData.minStock,
        unit: itemData.unit,
        unit_cost: itemData.unitCost,
        last_restocked: new Date().toISOString(),
      };

      const { error } = await supabase.from('inventory').insert(insert);
      if (error) throw error;

      await fetchInventory();
      toast.success('Producto agregado al inventario');
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Error al agregar el producto');
    }
  }, [fetchInventory]);

  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          name: updates.name,
          category: updates.category,
          current_stock: updates.currentStock,
          min_stock: updates.minStock,
          unit: updates.unit,
          unit_cost: updates.unitCost,
        })
        .eq('id', id);

      if (error) throw error;

      await fetchInventory();
      toast.success('Producto actualizado');
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Error al actualizar el producto');
    }
  }, [fetchInventory]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;

      await fetchInventory();
      toast.success('Producto eliminado');
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error('Error al eliminar el producto');
    }
  }, [fetchInventory]);

  // Restock item
  const restockItem = useCallback(async (id: string, amount: number) => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          current_stock: item.currentStock + amount,
          last_restocked: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: id,
          movement_type: 'restock',
          quantity: amount,
          reason: 'Reabastecimiento',
          created_by: user?.id,
        });

      if (movementError) console.error('Error recording movement:', movementError);

      await fetchInventory();
      toast.success(`Se agregaron ${amount} ${item.unit}`);
    } catch (error) {
      console.error('Error restocking:', error);
      toast.error('Error al reabastecer');
    }
  }, [items, user, fetchInventory]);

  // Deduct stock
  const deductStock = useCallback(async (id: string, amount: number): Promise<boolean> => {
    try {
      const item = items.find(i => i.id === id);
      if (!item || item.currentStock < amount) {
        toast.error('Stock insuficiente');
        return false;
      }

      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          current_stock: item.currentStock - amount,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Record movement
      await supabase.from('inventory_movements').insert({
        inventory_id: id,
        movement_type: 'deduction',
        quantity: amount,
        reason: 'Uso en servicio',
        created_by: user?.id,
      });

      await fetchInventory();
      return true;
    } catch (error) {
      console.error('Error deducting stock:', error);
      toast.error('Error al deducir stock');
      return false;
    }
  }, [items, user, fetchInventory]);

  // Get item by ID
  const getItemById = useCallback((id: string) => items.find(i => i.id === id), [items]);

  // Get low stock items
  const getLowStockItems = useCallback(() => items.filter(i => i.currentStock < i.minStock), [items]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchInventory();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

  return {
    items,
    loading,
    stats,
    addItem,
    updateItem,
    deleteItem,
    restockItem,
    deductStock,
    getItemById,
    getLowStockItems,
    fetchInventory,
  };
}
