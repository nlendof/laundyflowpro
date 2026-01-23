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
  // Role helpers
  isOwnerOrTechnician: boolean;
  isGeneralAdmin: boolean;
  isBranchAdmin: boolean;
  effectiveLaundryId: string | null;
  effectiveBranchId: string | null;
  // Combined loading state - true until BOTH auth AND laundry data are ready
  isFullyLoaded: boolean;
}

const LaundryContext = createContext<LaundryContextType | undefined>(undefined);

export function LaundryProvider({ children }: { children: ReactNode }) {
  const laundryData = useLaundry();
  const { user, isLoading: authLoading } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Role detection - only compute when user is fully loaded
  const isOwnerOrTechnician = !authLoading && user !== null && (user.role === 'owner' || user.role === 'technician');
  const isAdmin = !authLoading && user !== null && user.role === 'admin';
  
  // General admin = admin without branch_id (can see all branches of their laundry)
  const isGeneralAdmin = isAdmin && !user?.branchId;
  
  // Branch admin = admin with branch_id (can only see their assigned branch)
  const isBranchAdmin = isAdmin && !!user?.branchId;

  // For branch admins, their effective branch is always their assigned branch
  // For general admins and owners/technicians, it's the selected branch (or null for all)
  const effectiveBranchId = isBranchAdmin 
    ? user?.branchId || null 
    : selectedBranchId;

  // For non-owner users, their effective laundry is their assigned laundry
  // For owners/technicians, it's the selected laundry from the selector
  const effectiveLaundryId = isOwnerOrTechnician 
    ? laundryData.laundryId 
    : user?.laundryId || null;

  // Fetch branches when laundry changes (only for roles that can see branches)
  useEffect(() => {
    // Don't fetch until auth is fully loaded
    if (authLoading) return;
    
    const currentLaundryId = isOwnerOrTechnician 
      ? laundryData.currentLaundry?.id 
      : user?.laundryId;
    
    if (!currentLaundryId || isBranchAdmin) {
      // Branch admin doesn't need the branch list, they're locked to their branch
      if (!isBranchAdmin) {
        setBranches([]);
        setSelectedBranchIdState(null);
      }
      return;
    }

    // Only owners, technicians, and general admins need to fetch branches
    if (!isOwnerOrTechnician && !isGeneralAdmin) {
      setBranches([]);
      return;
    }

    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('id, code, name, is_main, laundry_id')
          .eq('laundry_id', currentLaundryId)
          .eq('is_active', true)
          .order('is_main', { ascending: false })
          .order('name');

        if (error) throw error;
        setBranches(data || []);

        // Load stored branch preference
        const storedBranchId = localStorage.getItem(`selectedBranch_${currentLaundryId}`);
        const branchExists = data?.some(b => b.id === storedBranchId);
        
        if (storedBranchId && branchExists) {
          setSelectedBranchIdState(storedBranchId);
        } else {
          // Default to null (all branches) for owner/technician/general admin
          setSelectedBranchIdState(null);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [authLoading, laundryData.currentLaundry?.id, user?.laundryId, isOwnerOrTechnician, isGeneralAdmin, isBranchAdmin]);

  const setSelectedBranchId = useCallback((branchId: string | null) => {
    // Branch admins cannot change their branch
    if (isBranchAdmin) return;
    
    setSelectedBranchIdState(branchId);
    const currentLaundryId = isOwnerOrTechnician 
      ? laundryData.currentLaundry?.id 
      : user?.laundryId;
    
    if (currentLaundryId) {
      if (branchId) {
        localStorage.setItem(`selectedBranch_${currentLaundryId}`, branchId);
      } else {
        localStorage.removeItem(`selectedBranch_${currentLaundryId}`);
      }
    }
    // Dispatch event for components that need to react
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId } }));
  }, [laundryData.currentLaundry?.id, user?.laundryId, isOwnerOrTechnician, isBranchAdmin]);

  // Combined loading state: auth must be done AND laundry data must be loaded
  // For owners/technicians, we also need laundryData to be ready
  const isFullyLoaded = !authLoading && !laundryData.loading && (
    // Non-owner roles: just need auth
    !isOwnerOrTechnician || 
    // Owner/technician: need laundry data loaded (even if empty)
    laundryData.userLaundries !== undefined
  );

  return (
    <LaundryContext.Provider value={{
      ...laundryData,
      branches,
      selectedBranchId: effectiveBranchId,
      setSelectedBranchId,
      loadingBranches,
      isOwnerOrTechnician,
      isGeneralAdmin,
      isBranchAdmin,
      effectiveLaundryId,
      effectiveBranchId,
      isFullyLoaded,
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
  const { effectiveLaundryId } = useLaundryContext();
  return effectiveLaundryId;
}

// Helper hook for getting branch filter for queries
export function useBranchFilter(): { laundryId: string | null; branchId: string | null } {
  const { effectiveLaundryId, effectiveBranchId } = useLaundryContext();
  return { laundryId: effectiveLaundryId, branchId: effectiveBranchId };
}