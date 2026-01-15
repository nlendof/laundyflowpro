import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';

export default function CustomerNotificationToggle() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="icon"
      onClick={handleToggle}
      disabled={isLoading || permission === 'denied'}
      className="relative"
      title={
        permission === 'denied' 
          ? 'Notificaciones bloqueadas en el navegador' 
          : isSubscribed 
            ? 'Desactivar notificaciones' 
            : 'Activar notificaciones'
      }
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="w-5 h-5" />
      ) : (
        <BellOff className="w-5 h-5" />
      )}
      {isSubscribed && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
      )}
    </Button>
  );
}
