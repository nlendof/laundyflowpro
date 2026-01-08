import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Outlet />;
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
