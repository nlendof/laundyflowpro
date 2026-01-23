import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLaundryContext } from '@/contexts/LaundryContext';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isFullyLoaded } = useLaundryContext();

  if (!isAuthenticated) {
    return <Outlet />;
  }

  // Show loading spinner until both auth AND laundry context are fully loaded
  // This prevents the UI from rendering with incomplete data
  if (authLoading || !isFullyLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
