import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import type { NotificationData } from '../../types/notification';

export function setupNotificationListeners() {
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    // eslint-disable-next-line no-console
    console.log('Notification received:', notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as unknown as NotificationData;
    handleNotificationTap(data);
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

export function handleNotificationTap(data: NotificationData) {
  switch (data.type) {
    case 'follow':
      router.push('/notifications');
      break;
    case 'comment':
    case 'tag':
    case 'was_there':
    case 'friend_logged':
      router.push(`/log/${data.logId}`);
      break;
    case 'artist_show':
    case 'tickets_on_sale':
      router.push(`/event/${data.eventId}`);
      break;
    case 'show_reminder':
      router.push('/wallet');
      break;
    case 'post_show':
      router.push({ pathname: '/log/details', params: { eventId: data.eventId } });
      break;
    default:
      router.push('/notifications');
  }
}



