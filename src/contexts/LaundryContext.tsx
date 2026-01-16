import React, { createContext, useContext, ReactNode } from 'react';
import { useLaundry, Laundry } from '@/hooks/useLaundry';

interface LaundryContextType {
  currentLaundry: Laundry | null;
  userLaundries: Laundry[];
  loading: boolean;
  error: string | null;
  switchLaundry: (laundryId: string) => void;
  updateLaundry: (updates: Partial<Laundry>) => Promise<void>;
  refetch: () => Promise<void>;
  laundryId: string | null;
}

const LaundryContext = createContext<LaundryContextType | undefined>(undefined);

export function LaundryProvider({ children }: { children: ReactNode }) {
  const laundryData = useLaundry();

  return (
    <LaundryContext.Provider value={laundryData}>
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
