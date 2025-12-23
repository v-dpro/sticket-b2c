import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { useSessionStore } from '../stores/sessionStore';
import { registerForPushNotifications, savePushToken } from '../lib/notifications/pushService';
import { setupNotificationListeners } from '../lib/notifications/notificationHandler';
import { useNotificationStore } from '../stores/notificationStore';
import { getUnreadCount } from '../lib/api/notifications';

export function usePushNotifications() {
  const isLoggedIn = useSessionStore((state) => Boolean(state.user));
  const notificationListener = useRef<ReturnType<typeof setupNotificationListeners> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    // hydrate stored token (optional)
    void useNotificationStore.getState().hydrate();
    void getUnreadCount()
      .then((count) => useNotificationStore.getState().setUnreadCount(count))
      .catch(() => {
        // ignore
      });

    async function register() {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    }

    void register();

    const cleanup = setupNotificationListeners();
    notificationListener.current = cleanup;

    return cleanup;
  }, [isLoggedIn]);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        // Optionally handle deep-linking here.
      }
    });
  }, []);
}



