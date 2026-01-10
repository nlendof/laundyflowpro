import { Bell, BellOff, BellRing, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { sendLocalNotification } from '@/lib/pushNotifications';
import { toast } from 'sonner';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = () => {
    if (permission !== 'granted') {
      toast.error('Primero debes activar las notificaciones');
      return;
    }

    sendLocalNotification('🧪 Notificación de Prueba', {
      body: 'Las notificaciones están funcionando correctamente',
      tag: 'test-notification',
    });
    
    toast.success('Notificación de prueba enviada');
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500">Permitido</Badge>;
      case 'denied':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">Sin decidir</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificaciones Push
          </CardTitle>
          <CardDescription>
            Las notificaciones push no están disponibles en este navegador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Para recibir notificaciones, usa un navegador compatible como Chrome, Firefox, Edge o Safari (iOS 16.4+).
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Notificaciones Push
        </CardTitle>
        <CardDescription>
          Recibe alertas cuando lleguen nuevos pedidos o cambien de estado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Estado del permiso</p>
            <p className="text-xs text-muted-foreground">
              {permission === 'denied' 
                ? 'Desbloéalo desde la configuración del navegador'
                : 'El navegador preguntará si deseas recibir notificaciones'}
            </p>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="push-notifications" className="text-base font-medium">
              Notificaciones activas
            </Label>
            <p className="text-sm text-muted-foreground">
              Recibir notificaciones de nuevos pedidos y cambios de estado
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Notification Types */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Tipos de notificaciones</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm">Nuevos pedidos</span>
              </div>
              <Badge variant="outline" className="text-xs">Siempre</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Cambios de estado</span>
              </div>
              <Badge variant="outline" className="text-xs">Siempre</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-500" />
                <span className="text-sm">Pedidos listos</span>
              </div>
              <Badge variant="outline" className="text-xs">Siempre</Badge>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleTestNotification}
          disabled={permission !== 'granted'}
        >
          <Bell className="mr-2 h-4 w-4" />
          Enviar notificación de prueba
        </Button>

        {/* Help Text */}
        {permission === 'denied' && (
          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            <p className="text-sm text-destructive">
              Las notificaciones están bloqueadas. Para activarlas:
            </p>
            <ol className="text-xs text-destructive/80 mt-2 ml-4 list-decimal space-y-1">
              <li>Haz clic en el ícono de candado/info en la barra de direcciones</li>
              <li>Busca "Notificaciones" en los permisos</li>
              <li>Cambia a "Permitir"</li>
              <li>Recarga la página</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
