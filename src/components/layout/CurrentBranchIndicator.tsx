import { useLaundryContext } from '@/contexts/LaundryContext';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function CurrentBranchIndicator() {
  const { user } = useAuth();
  const { 
    currentLaundry, 
    branches, 
    selectedBranchId 
  } = useLaundryContext();

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';

  // Only show for admins and owners
  if (!isAdmin && !isOwner) return null;
  if (!currentLaundry) return null;

  const selectedBranch = selectedBranchId 
    ? branches.find(b => b.id === selectedBranchId)
    : null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
      {isOwner && (
        <div className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{currentLaundry.name}</span>
        </div>
      )}
      
      {isOwner && <span className="text-muted-foreground">/</span>}
      
      <div className="flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        {selectedBranch ? (
          <Badge variant="secondary" className="font-normal">
            <span className="font-mono text-xs mr-1">[{selectedBranch.code}]</span>
            {selectedBranch.name}
            {selectedBranch.is_main && <span className="ml-1 text-primary">★</span>}
          </Badge>
        ) : (
          <Badge variant="outline" className="font-normal">
            Todas las sucursales
          </Badge>
        )}
      </div>
    </div>
  );
}
