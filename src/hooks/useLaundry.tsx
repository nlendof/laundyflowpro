import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Laundry {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface LaundryUser {
  id: string;
  laundry_id: string;
  user_id: string;
  is_primary: boolean;
  created_at: string;
}

export function useLaundry() {
  const { user } = useAuth();
  const [currentLaundry, setCurrentLaundry] = useState<Laundry | null>(null);
  const [userLaundries, setUserLaundries] = useState<Laundry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserLaundries = useCallback(async () => {
    if (!user) {
      setCurrentLaundry(null);
      setUserLaundries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get laundries the user belongs to
      const { data: laundryUsers, error: luError } = await supabase
        .from('laundry_users')
        .select('laundry_id, is_primary')
        .eq('user_id', user.id);

      if (luError) throw luError;

      if (!laundryUsers || laundryUsers.length === 0) {
        setCurrentLaundry(null);
        setUserLaundries([]);
        setLoading(false);
        return;
      }

      const laundryIds = laundryUsers.map(lu => lu.laundry_id);
      
      const { data: laundries, error: lError } = await supabase
        .from('laundries')
        .select('*')
        .in('id', laundryIds)
        .eq('is_active', true);

      if (lError) throw lError;

      setUserLaundries(laundries || []);

      // Set current laundry (prefer primary, or first one)
      const primaryLaundryUser = laundryUsers.find(lu => lu.is_primary);
      const currentId = primaryLaundryUser?.laundry_id || laundryUsers[0]?.laundry_id;
      const current = laundries?.find(l => l.id === currentId) || laundries?.[0] || null;
      
      setCurrentLaundry(current);
    } catch (err) {
      console.error('Error fetching laundries:', err);
      setError(err instanceof Error ? err.message : 'Error loading laundries');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserLaundries();
  }, [fetchUserLaundries]);

  const switchLaundry = useCallback((laundryId: string) => {
    const laundry = userLaundries.find(l => l.id === laundryId);
    if (laundry) {
      setCurrentLaundry(laundry);
      // Store preference in localStorage
      localStorage.setItem('currentLaundryId', laundryId);
    }
  }, [userLaundries]);

  const updateLaundry = useCallback(async (updates: Partial<Laundry>) => {
    if (!currentLaundry) return;

    const { error } = await supabase
      .from('laundries')
      .update(updates)
      .eq('id', currentLaundry.id);

    if (error) throw error;

    setCurrentLaundry(prev => prev ? { ...prev, ...updates } : null);
    setUserLaundries(prev => 
      prev.map(l => l.id === currentLaundry.id ? { ...l, ...updates } : l)
    );
  }, [currentLaundry]);

  return {
    currentLaundry,
    userLaundries,
    loading,
    error,
    switchLaundry,
    updateLaundry,
    refetch: fetchUserLaundries,
    laundryId: currentLaundry?.id || null,
  };
}
