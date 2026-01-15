import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import DriverAuth from '@/components/driver/DriverAuth';
import DriverDashboard from '@/components/driver/DriverDashboard';

export default function DriverPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkDriverRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          checkDriverRole(session.user.id);
        } else {
          setIsDriver(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkDriverRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    setIsDriver(data?.role === 'delivery');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <DriverAuth />;
  }

  if (!isDriver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 to-secondary/10 p-4">
        <div className="bg-card p-6 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground mb-4">
            Esta cuenta no tiene permisos de repartidor. Contacta al administrador.
          </p>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return <DriverDashboard session={session} />;
}
