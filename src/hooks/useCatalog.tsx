import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type DbService = Tables<'catalog_services'>;
type DbArticle = Tables<'catalog_articles'>;
type DbExtra = Tables<'catalog_extras'>;

export type CatalogItemType = 'service' | 'article';
export type PricingType = 'weight' | 'piece' | 'fixed';

export interface CatalogExtra {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type: CatalogItemType;
  pricingType: PricingType;
  price: number;
  category: string;
  estimatedTime?: number;
  isActive: boolean;
  extras?: CatalogExtra[];
  createdAt: Date;
}

export function useCatalog() {
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [articles, setArticles] = useState<CatalogItem[]>([]);
  const [extras, setExtras] = useState<CatalogExtra[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all catalog data
  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);

      const [servicesRes, articlesRes, extrasRes] = await Promise.all([
        supabase.from('catalog_services').select('*').order('name'),
        supabase.from('catalog_articles').select('*').order('name'),
        supabase.from('catalog_extras').select('*').order('name'),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (articlesRes.error) throw articlesRes.error;
      if (extrasRes.error) throw extrasRes.error;

      // Map services
      const mappedServices: CatalogItem[] = (servicesRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        type: 'service',
        pricingType: s.unit === 'kg' ? 'weight' : 'piece',
        price: s.price,
        category: s.category,
        estimatedTime: s.estimated_time || undefined,
        isActive: s.is_active ?? true,
        createdAt: new Date(s.created_at || new Date()),
      }));

      // Map articles
      const mappedArticles: CatalogItem[] = (articlesRes.data || []).map(a => ({
        id: a.id,
        name: a.name,
        description: a.description || undefined,
        type: 'article',
        pricingType: 'piece',
        price: a.price,
        category: a.category,
        isActive: a.is_active ?? true,
        createdAt: new Date(a.created_at || new Date()),
      }));

      // Map extras
      const mappedExtras: CatalogExtra[] = (extrasRes.data || []).map(e => ({
        id: e.id,
        name: e.name,
        price: e.price,
        isActive: e.is_active ?? true,
      }));

      setServices(mappedServices);
      setArticles(mappedArticles);
      setExtras(mappedExtras);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      toast.error('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Combined items
  const items = useMemo(() => [...services, ...articles], [services, articles]);
  const activeServices = useMemo(() => services.filter(s => s.isActive), [services]);
  const activeArticles = useMemo(() => articles.filter(a => a.isActive), [articles]);
  const activeItems = useMemo(() => items.filter(i => i.isActive), [items]);
  const activeExtras = useMemo(() => extras.filter(e => e.isActive), [extras]);

  // Add item
  const addItem = useCallback(async (itemData: Omit<CatalogItem, 'id' | 'createdAt'>) => {
    try {
      if (itemData.type === 'service') {
        const insert: TablesInsert<'catalog_services'> = {
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          price: itemData.price,
          unit: itemData.pricingType === 'weight' ? 'kg' : 'pieza',
          estimated_time: itemData.estimatedTime,
          is_active: itemData.isActive,
        };
        const { error } = await supabase.from('catalog_services').insert(insert);
        if (error) throw error;
      } else {
        const insert: TablesInsert<'catalog_articles'> = {
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          price: itemData.price,
          is_active: itemData.isActive,
        };
        const { error } = await supabase.from('catalog_articles').insert(insert);
        if (error) throw error;
      }

      await fetchCatalog();
      toast.success('Elemento agregado al catálogo');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Error al agregar el elemento');
    }
  }, [fetchCatalog]);

  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<CatalogItem>) => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      if (item.type === 'service') {
        const { error } = await supabase
          .from('catalog_services')
          .update({
            name: updates.name,
            description: updates.description,
            category: updates.category,
            price: updates.price,
            unit: updates.pricingType === 'weight' ? 'kg' : 'pieza',
            estimated_time: updates.estimatedTime,
            is_active: updates.isActive,
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('catalog_articles')
          .update({
            name: updates.name,
            description: updates.description,
            category: updates.category,
            price: updates.price,
            is_active: updates.isActive,
          })
          .eq('id', id);
        if (error) throw error;
      }

      await fetchCatalog();
      toast.success('Elemento actualizado');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error al actualizar el elemento');
    }
  }, [items, fetchCatalog]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      if (item.type === 'service') {
        const { error } = await supabase.from('catalog_services').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('catalog_articles').delete().eq('id', id);
        if (error) throw error;
      }

      await fetchCatalog();
      toast.success('Elemento eliminado');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error al eliminar el elemento');
    }
  }, [items, fetchCatalog]);

  // Toggle active
  const toggleActive = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      await updateItem(id, { isActive: !item.isActive });
    }
  }, [items, updateItem]);

  // Get item by ID
  const getItemById = useCallback((id: string) => items.find(i => i.id === id), [items]);

  // Add extra
  const addExtra = useCallback(async (extraData: Omit<CatalogExtra, 'id'>) => {
    try {
      const { error } = await supabase.from('catalog_extras').insert({
        name: extraData.name,
        price: extraData.price,
        is_active: extraData.isActive,
      });
      if (error) throw error;
      await fetchCatalog();
      toast.success('Extra agregado');
    } catch (error) {
      console.error('Error adding extra:', error);
      toast.error('Error al agregar el extra');
    }
  }, [fetchCatalog]);

  // Initial fetch
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    items,
    services,
    articles,
    extras,
    loading,
    activeServices,
    activeArticles,
    activeItems,
    activeExtras,
    addItem,
    updateItem,
    deleteItem,
    toggleActive,
    getItemById,
    addExtra,
    fetchCatalog,
  };
}
