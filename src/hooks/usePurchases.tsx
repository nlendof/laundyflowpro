import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface PurchaseItem {
  id?: string;
  itemType: 'inventory' | 'catalog_article';
  inventoryId?: string;
  articleId?: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  stockBefore: number;
  stockAction: 'add' | 'replace';
}

export interface Purchase {
  id: string;
  purchaseDate: Date;
  supplierName?: string;
  totalAmount: number;
  notes?: string;
  status: string;
  createdBy?: string;
  createdAt: Date;
  items?: PurchaseItem[];
}

export function usePurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          purchase_items (*)
        `)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      const mapped: Purchase[] = (data || []).map(p => ({
        id: p.id,
        purchaseDate: new Date(p.purchase_date),
        supplierName: p.supplier_name,
        totalAmount: Number(p.total_amount),
        notes: p.notes,
        status: p.status,
        createdBy: p.created_by,
        createdAt: new Date(p.created_at),
        items: (p.purchase_items || []).map((item: any) => ({
          id: item.id,
          itemType: item.item_type as 'inventory' | 'catalog_article',
          inventoryId: item.inventory_id,
          articleId: item.article_id,
          itemName: item.item_name,
          quantity: Number(item.quantity),
          unitCost: Number(item.unit_cost),
          totalCost: Number(item.total_cost),
          stockBefore: Number(item.stock_before),
          stockAction: item.stock_action as 'add' | 'replace',
        })),
      }));

      setPurchases(mapped);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Error al cargar las compras');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPurchase = useCallback(async (
    purchaseData: {
      supplierName?: string;
      notes?: string;
      items: PurchaseItem[];
    }
  ) => {
    try {
      const totalAmount = purchaseData.items.reduce((sum, item) => sum + item.totalCost, 0);

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          supplier_name: purchaseData.supplierName,
          notes: purchaseData.notes,
          total_amount: totalAmount,
          created_by: user?.id,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create purchase items
      const itemsToInsert = purchaseData.items.map(item => ({
        purchase_id: purchase.id,
        item_type: item.itemType,
        inventory_id: item.inventoryId || null,
        article_id: item.articleId || null,
        item_name: item.itemName,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        total_cost: item.totalCost,
        stock_before: item.stockBefore,
        stock_action: item.stockAction,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update stock for each item
      for (const item of purchaseData.items) {
        const newStock = item.stockAction === 'add' 
          ? item.stockBefore + item.quantity 
          : item.quantity;

        if (item.itemType === 'inventory' && item.inventoryId) {
          await supabase
            .from('inventory')
            .update({ 
              current_stock: newStock,
              last_restocked: new Date().toISOString(),
            })
            .eq('id', item.inventoryId);

          // Record movement
          await supabase.from('inventory_movements').insert({
            inventory_id: item.inventoryId,
            movement_type: 'purchase',
            quantity: item.quantity,
            reason: `Compra - ${item.stockAction === 'add' ? 'Sumado' : 'Reemplazado'}`,
            created_by: user?.id,
          });
        } else if (item.itemType === 'catalog_article' && item.articleId) {
          await supabase
            .from('catalog_articles')
            .update({ stock: newStock })
            .eq('id', item.articleId);
        }
      }

      await fetchPurchases();
      toast.success('Compra registrada exitosamente');
      return purchase.id;
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error('Error al registrar la compra');
      return null;
    }
  }, [user, fetchPurchases]);

  const deletePurchase = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;

      await fetchPurchases();
      toast.success('Compra eliminada');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Error al eliminar la compra');
    }
  }, [fetchPurchases]);

  // Initial fetch
  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Real-time subscription for purchases changes
  useEffect(() => {
    const channel = supabase
      .channel('purchases-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        () => fetchPurchases()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_items' },
        () => fetchPurchases()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPurchases]);

  return {
    purchases,
    loading,
    createPurchase,
    deletePurchase,
    fetchPurchases,
  };
}
