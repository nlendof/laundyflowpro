import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Cargando sesión…' : 'Redirigiendo…'}
          </p>
        </div>

        {/* Fallback buttons in case navigation is blocked */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/login')}>
            Ir a iniciar sesión
          </Button>
          <Button onClick={() => navigate('/dashboard')}>Ir al dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

