import { apiClient } from './client';
import type { Notification, NotificationPreferences } from '../../types/notification';

export async function getNotifications(options?: {
  limit?: number;
  before?: string;
}): Promise<{ notifications: Notification[]; nextCursor?: string | null; unreadCount: number }> {
  const response = await apiClient.get('/notifications', { params: options });
  return response.data;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/notifications/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.count;
}

export async function getNotificationPrefs(): Promise<NotificationPreferences> {
  const response = await apiClient.get('/notifications/preferences');
  return response.data;
}

export async function updateNotificationPrefs(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const response = await apiClient.patch('/notifications/preferences', prefs);
  return response.data;
}

export async function registerPushToken(token: string): Promise<void> {
  await apiClient.post('/notifications/push-token', { token });
}

export async function removePushToken(token: string): Promise<void> {
  await apiClient.delete('/notifications/push-token', { data: { token } });
}



