import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useLaundry, Laundry } from '@/hooks/useLaundry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Branch {
  id: string;
  code: string;
  name: string;
  is_main: boolean;
  laundry_id: string;
}

interface LaundryContextType {
  currentLaundry: Laundry | null;
  userLaundries: Laundry[];
  loading: boolean;
  error: string | null;
  switchLaundry: (laundryId: string) => void;
  updateLaundry: (updates: Partial<Laundry>) => Promise<void>;
  refetch: () => Promise<void>;
  laundryId: string | null;
  // Branch selection
  branches: Branch[];
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string | null) => void;
  loadingBranches: boolean;
}

const LaundryContext = createContext<LaundryContextType | undefined>(undefined);

export function LaundryProvider({ children }: { children: ReactNode }) {
  const laundryData = useLaundry();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';

  // Fetch branches when laundry changes
  useEffect(() => {
    if (!laundryData.currentLaundry?.id || (!isAdmin && !isOwner)) {
      setBranches([]);
      setSelectedBranchIdState(null);
      return;
    }

    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('id, code, name, is_main, laundry_id')
          .eq('laundry_id', laundryData.currentLaundry!.id)
          .eq('is_active', true)
          .order('is_main', { ascending: false })
          .order('name');

        if (error) throw error;
        setBranches(data || []);

        // Load stored branch preference or select main branch
        const storedBranchId = localStorage.getItem(`selectedBranch_${laundryData.currentLaundry!.id}`);
        const branchExists = data?.some(b => b.id === storedBranchId);
        
        if (storedBranchId && branchExists) {
          setSelectedBranchIdState(storedBranchId);
        } else {
          // Default to null (all branches) for owner/admin, or main branch
          const mainBranch = data?.find(b => b.is_main);
          setSelectedBranchIdState(null); // Show all by default
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [laundryData.currentLaundry?.id, isAdmin, isOwner]);

  const setSelectedBranchId = useCallback((branchId: string | null) => {
    setSelectedBranchIdState(branchId);
    if (laundryData.currentLaundry?.id) {
      if (branchId) {
        localStorage.setItem(`selectedBranch_${laundryData.currentLaundry.id}`, branchId);
      } else {
        localStorage.removeItem(`selectedBranch_${laundryData.currentLaundry.id}`);
      }
    }
    // Dispatch event for components that need to react
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId } }));
  }, [laundryData.currentLaundry?.id]);

  return (
    <LaundryContext.Provider value={{
      ...laundryData,
      branches,
      selectedBranchId,
      setSelectedBranchId,
      loadingBranches,
    }}>
      {children}
    </LaundryContext.Provider>
  );
}

export function useLaundryContext() {
  const context = useContext(LaundryContext);
  if (context === undefined) {
    throw new Error('useLaundryContext must be used within a LaundryProvider');
  }
  return context;
}

// Helper hook for getting laundry_id for queries
export function useCurrentLaundryId(): string | null {
  const { laundryId } = useLaundryContext();
  return laundryId;
}

// Helper hook for getting branch filter for queries
export function useBranchFilter(): { laundryId: string | null; branchId: string | null } {
  const { laundryId, selectedBranchId } = useLaundryContext();
  return { laundryId, branchId: selectedBranchId };
}
