import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * DEV ONLY: Button to force a full context reset in Preview environment.
 * 
 * TO REMOVE: Simply delete this file and remove the import/usage from AppSidebar.tsx
 */
export function DevResetButton() {
  // Only show in development
  if (import.meta.env.PROD) return null;

  const handleReset = () => {
    // Clear all localStorage related to laundry/branch selection
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('selectedBranch_') || key.startsWith('selectedLaundry_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Force a full page reload to reinitialize all contexts
    window.location.reload();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">Reset contexto (solo dev)</p>
      </TooltipContent>
    </Tooltip>
  );
}
