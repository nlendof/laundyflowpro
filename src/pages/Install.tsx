import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, RefreshCcw, Download, Smartphone, Share } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">¡App Instalada!</CardTitle>
            <CardDescription>
              Luis Cap Lavandería ya está instalada en tu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Ir al Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Download className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Instalar App</CardTitle>
          <CardDescription>
            Instala Luis Cap Lavandería en tu dispositivo para acceso rápido y offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstallable && !isIOS && (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="h-5 w-5 mr-2" />
              Instalar Ahora
            </Button>
          )}

          {isIOS && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <p className="font-medium">Instrucciones para iPhone/iPad:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <span>Toca el botón</span>
                    <Share className="h-4 w-4 inline" />
                    <span>Compartir en Safari</span>
                  </li>
                  <li>Desplázate y toca "Añadir a la pantalla de inicio"</li>
                  <li>Toca "Añadir" para confirmar</li>
                </ol>
              </div>
            </div>
          )}

          {!isInstallable && !isIOS && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Para instalar la app, abre este sitio en tu navegador móvil y busca la opción "Instalar app" o "Añadir a pantalla de inicio" en el menú.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Actualizar Página
              </Button>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            <h3 className="font-medium">Beneficios de la app:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ Acceso rápido desde tu pantalla de inicio</li>
              <li>✓ Funciona sin conexión a internet</li>
              <li>✓ Experiencia de app nativa</li>
              <li>✓ Carga más rápida</li>
            </ul>
          </div>

          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">
              Continuar en el navegador
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
