import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';

const ErrorPage = () => {
  const error = useRouteError();
  
  let errorMessage = 'Ha ocurrido un error inesperado';
  let errorCode = '500';
  let errorTitle = 'Error del Servidor';

  if (isRouteErrorResponse(error)) {
    errorCode = error.status.toString();
    if (error.status === 404) {
      errorTitle = 'Página no encontrada';
      errorMessage = 'La página que buscas no existe o ha sido movida.';
    } else if (error.status === 403) {
      errorTitle = 'Acceso denegado';
      errorMessage = 'No tienes permiso para acceder a esta página.';
    } else if (error.status === 500) {
      errorTitle = 'Error del servidor';
      errorMessage = 'Ha ocurrido un error en el servidor. Por favor intenta más tarde.';
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/10 p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <p className="text-6xl font-bold text-destructive">{errorCode}</p>
          <h1 className="text-2xl font-semibold">{errorTitle}</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Ir al Dashboard
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Si el problema persiste, contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
};

export default ErrorPage;
