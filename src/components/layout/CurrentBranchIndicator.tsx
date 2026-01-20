import { useLaundryContext } from '@/contexts/LaundryContext';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CurrentBranchIndicatorProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'header';
}

export function CurrentBranchIndicator({ 
  collapsed = false, 
  variant = 'header' 
}: CurrentBranchIndicatorProps) {
  const { user } = useAuth();
  const { 
    currentLaundry, 
    branches, 
    selectedBranchId,
    isOwnerOrTechnician,
    isGeneralAdmin,
    isBranchAdmin,
  } = useLaundryContext();

  // Get laundry name - for non-owner users, get from user's laundry
  const laundryName = currentLaundry?.name || 'Sin lavandería';

  // Get branch info
  const selectedBranch = selectedBranchId 
    ? branches.find(b => b.id === selectedBranchId)
    : null;

  // For branch admin, get branch name from their assigned branch
  const getBranchDisplay = () => {
    if (isBranchAdmin && user?.branchId) {
      // Branch admin shows their assigned branch
      const assignedBranch = branches.find(b => b.id === user.branchId);
      if (assignedBranch) {
        return {
          code: assignedBranch.code,
          name: assignedBranch.name,
          isMain: assignedBranch.is_main,
        };
      }
      return null;
    }
    
    if (selectedBranch) {
      return {
        code: selectedBranch.code,
        name: selectedBranch.name,
        isMain: selectedBranch.is_main,
      };
    }
    
    return null;
  };

  const branchDisplay = getBranchDisplay();
  const showAllBranches = !isBranchAdmin && !selectedBranchId;

  // For sidebar variant (collapsed)
  if (variant === 'sidebar' && collapsed) {
    return (
      <div className="flex flex-col gap-1 items-center py-2">
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center" title={laundryName}>
          <Store className="w-3 h-3 text-primary" />
        </div>
        {branchDisplay && (
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center" title={branchDisplay.name}>
            <Building2 className="w-3 h-3 text-accent-foreground" />
          </div>
        )}
      </div>
    );
  }

  // For sidebar variant (expanded)
  if (variant === 'sidebar') {
    return (
      <div className="space-y-1.5 py-2">
        {/* Laundry name */}
        <div className="flex items-center gap-2 px-1">
          <Store className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-sidebar-foreground truncate">
            {laundryName}
          </span>
        </div>
        
        {/* Branch info */}
        <div className="flex items-center gap-2 px-1">
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {branchDisplay ? (
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-mono text-[10px] text-muted-foreground">[{branchDisplay.code}]</span>
              <span className="text-xs text-sidebar-foreground truncate">{branchDisplay.name}</span>
              {branchDisplay.isMain && <span className="text-primary text-xs">★</span>}
            </div>
          ) : showAllBranches ? (
            <span className="text-xs text-muted-foreground italic">Todas las sucursales</span>
          ) : (
            <span className="text-xs text-muted-foreground">Sin sucursal</span>
          )}
        </div>
      </div>
    );
  }

  // Header variant (original style)
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-1.5">
        <Store className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{laundryName}</span>
      </div>
      
      <span className="text-muted-foreground">/</span>
      
      <div className="flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        {branchDisplay ? (
          <Badge variant="secondary" className="font-normal">
            <span className="font-mono text-xs mr-1">[{branchDisplay.code}]</span>
            {branchDisplay.name}
            {branchDisplay.isMain && <span className="ml-1 text-primary">★</span>}
          </Badge>
        ) : showAllBranches ? (
          <Badge variant="outline" className="font-normal">
            Todas las sucursales
          </Badge>
        ) : (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Sin sucursal
          </Badge>
        )}
      </div>
    </div>
  );
}