export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready

    // Web Push subscription would require VAPID keys from backend
    // Fallback: in-app notifications via Realtime (see useAlertas)
    console.info('PWA service worker ready for push notifications', registration.scope)
  } catch (error) {
    console.warn('Push notifications not available:', error)
  }
}

export function showLocalNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}
