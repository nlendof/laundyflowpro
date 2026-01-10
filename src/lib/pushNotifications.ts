// Push Notifications Service
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current permission status
export const getNotificationPermission = (): NotificationPermission => {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Subscribe to push notifications
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
};

// Send a local notification (when app is open)
export const sendLocalNotification = (title: string, options?: NotificationOptions): void => {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    // Use service worker for notification if available
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        requireInteraction: false,
        ...options,
      } as NotificationOptions);
    });
  } catch (error) {
    // Fallback to basic notification
    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        ...options,
      });
    } catch (e) {
      console.warn('Could not show notification:', e);
    }
  }
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Order status translations for notifications
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_pickup: 'Pendiente de recoger',
  in_store: 'En tienda',
  washing: 'Lavando',
  drying: 'Secando',
  ironing: 'Planchando',
  ready_delivery: 'Listo para entregar',
  in_transit: 'En camino',
  delivered: 'Entregado',
};

// Notify about new order
export const notifyNewOrder = (ticketCode: string, customerName: string): void => {
  sendLocalNotification(`🧺 Nuevo Pedido: ${ticketCode}`, {
    body: `Cliente: ${customerName}`,
    tag: `order-${ticketCode}`,
    data: { type: 'new_order', ticketCode },
  });
};

// Notify about order status change
export const notifyOrderStatusChange = (
  ticketCode: string,
  customerName: string,
  newStatus: string
): void => {
  const statusLabel = ORDER_STATUS_LABELS[newStatus] || newStatus;
  
  sendLocalNotification(`📦 Pedido ${ticketCode}`, {
    body: `${customerName} - ${statusLabel}`,
    tag: `order-status-${ticketCode}`,
    data: { type: 'status_change', ticketCode, status: newStatus },
  });
};
