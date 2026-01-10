import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushNotifications';
import { toast } from 'sonner';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Update permission when it changes
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      setPermission(getNotificationPermission());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Las notificaciones push no están soportadas en este navegador');
      return false;
    }

    setIsLoading(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('¡Notificaciones activadas!');
        return true;
      } else if (result === 'denied') {
        toast.error('Permiso de notificaciones denegado');
        return false;
      } else {
        toast.info('Permiso de notificaciones pendiente');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Error al solicitar permisos');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      // First ensure we have permission
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      const subscription = await subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        toast.success('¡Suscrito a notificaciones!');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Error al suscribirse a notificaciones');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
        toast.success('Notificaciones desactivadas');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Error al desactivar notificaciones');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
