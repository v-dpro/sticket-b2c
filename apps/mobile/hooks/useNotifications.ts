import { useCallback, useEffect, useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

import { getNotifications, markAllAsRead, markAsRead } from '../lib/api/notifications';
import type { Notification, NotificationGroup } from '../types/notification';
import { useNotificationStore } from '../stores/notificationStore';

function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const groups: Map<string, Notification[]> = new Map();

  for (const notification of notifications) {
    const date = parseISO(notification.createdAt);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else {
      label = format(date, 'MMMM d');
    }

    const existing = groups.get(label) || [];
    groups.set(label, [...existing, notification]);
  }

  return Array.from(groups.entries()).map(([date, notifications]) => ({
    date,
    notifications,
  }));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  const { setUnreadCount, decrementUnread, clearUnread } = useNotificationStore();

  const LIMIT = 30;

  const fetch = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getNotifications({ limit: LIMIT });
      setNotifications(data.notifications);
      setGroups(groupNotifications(data.notifications));
      setNextCursor(data.nextCursor ?? undefined);
      setHasMore(Boolean(data.nextCursor));
      setUnreadCount(data.unreadCount);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUnreadCount]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;

    setLoadingMore(true);
    try {
      const data = await getNotifications({ limit: LIMIT, before: nextCursor });
      const allNotifications = [...notifications, ...data.notifications];
      setNotifications(allNotifications);
      setGroups(groupNotifications(allNotifications));
      setNextCursor(data.nextCursor ?? undefined);
      setHasMore(Boolean(data.nextCursor));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor, notifications]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await markAsRead(id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            notifications: g.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          }))
        );
        decrementUnread();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to mark notification as read:', error);
      }
    },
    [decrementUnread]
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setGroups((prev) => prev.map((g) => ({ ...g, notifications: g.notifications.map((n) => ({ ...n, read: true })) })));
      clearUnread();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [clearUnread]);

  return {
    notifications,
    groups,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh: () => fetch(true),
    loadMore,
    markRead,
    markAllRead,
  };
}



