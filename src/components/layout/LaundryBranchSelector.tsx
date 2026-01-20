import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLaundryContext } from '@/contexts/LaundryContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Store, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Laundry {
  id: string;
  name: string;
}

interface LaundryBranchSelectorProps {
  collapsed?: boolean;
}

export function LaundryBranchSelector({ collapsed = false }: LaundryBranchSelectorProps) {
  const { user } = useAuth();
  const { 
    currentLaundry, 
    switchLaundry, 
    loading: laundryLoading,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    loadingBranches,
    isOwnerOrTechnician,
    isGeneralAdmin,
    isBranchAdmin,
  } = useLaundryContext();
  
  const [ownerLaundries, setOwnerLaundries] = useState<Laundry[]>([]);
  const [loadingOwnerLaundries, setLoadingOwnerLaundries] = useState(false);

  // For owners/technicians: fetch all laundries
  useEffect(() => {
    if (!isOwnerOrTechnician) return;

    const fetchAllLaundries = async () => {
      setLoadingOwnerLaundries(true);
      try {
        const { data, error } = await supabase
          .from('laundries')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setOwnerLaundries(data || []);
      } catch (error) {
        console.error('Error fetching laundries for owner:', error);
      } finally {
        setLoadingOwnerLaundries(false);
      }
    };

    fetchAllLaundries();
  }, [isOwnerOrTechnician]);

  const handleLaundryChange = (laundryId: string) => {
    switchLaundry(laundryId);
    setSelectedBranchId(null);
  };

  const handleBranchChange = (branchId: string) => {
    // "all" means no filter (null)
    setSelectedBranchId(branchId === 'all' ? null : branchId);
  };

  // Branch admins and other staff don't see any selectors
  if (isBranchAdmin || (!isOwnerOrTechnician && !isGeneralAdmin)) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="flex flex-col gap-2 items-center">
        {isOwnerOrTechnician && (
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center" title="Lavandería">
            <Store className="w-4 h-4 text-accent-foreground" />
          </div>
        )}
        {(isOwnerOrTechnician || isGeneralAdmin) && (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center" title="Sucursal">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Laundry Selector - Only for owners/technicians */}
      {isOwnerOrTechnician && (
        <div className="space-y-1">
          <label className="text-xs text-sidebar-foreground/60 font-medium flex items-center gap-1">
            <Store className="w-3 h-3" />
            Lavandería
          </label>
          <Select
            value={currentLaundry?.id || ''}
            onValueChange={handleLaundryChange}
            disabled={loadingOwnerLaundries}
          >
            <SelectTrigger className={cn(
              "w-full h-8 text-xs bg-sidebar-accent border-sidebar-border",
              loadingOwnerLaundries && "opacity-50"
            )}>
              {loadingOwnerLaundries ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <SelectValue placeholder="Seleccionar lavandería" />
              )}
            </SelectTrigger>
            <SelectContent>
              {ownerLaundries.map((laundry) => (
                <SelectItem key={laundry.id} value={laundry.id}>
                  {laundry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Branch Selector - For owners/technicians and general admins */}
      {(isOwnerOrTechnician || isGeneralAdmin) && currentLaundry && (
        <div className="space-y-1">
          <label className="text-xs text-sidebar-foreground/60 font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Sucursal
          </label>
          <Select
            value={selectedBranchId || 'all'}
            onValueChange={handleBranchChange}
            disabled={loadingBranches || branches.length === 0}
          >
            <SelectTrigger className={cn(
              "w-full h-8 text-xs bg-sidebar-accent border-sidebar-border",
              loadingBranches && "opacity-50"
            )}>
              {loadingBranches ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <SelectValue placeholder="Seleccionar sucursal" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">Todas las sucursales</span>
              </SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  <span className="font-mono text-xs mr-1">[{branch.code}]</span>
                  {branch.name}
                  {branch.is_main && <span className="ml-1 text-primary">★</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}