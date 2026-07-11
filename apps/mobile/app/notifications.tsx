import { Stack, useRouter } from 'expo-router';

// Stack route (was a hidden tab): pushed from the Home bell and
// notification taps, so it needs its own back affordance.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../components/ui/Screen';
import { colors, spacing } from '../lib/theme';
import { useNotifications } from '../hooks/useNotifications';
import { handleNotificationTap } from '../lib/notifications/notificationHandler';
import type { Notification } from '../types/notification';
import { EmptyNotifications } from '../components/notifications/EmptyNotifications';
import { NotificationSkeleton } from '../components/notifications/NotificationSkeleton';
import { NotificationList } from '../components/notifications/NotificationList';

export default function NotificationsScreen() {
  const router = useRouter();
  const { groups, loading, refreshing, loadingMore, hasMore, refresh, loadMore, markRead, markAllRead } = useNotifications();

  const hasUnread = groups.some((g) => g.notifications.some((n) => !n.read));

  const onPressNotification = (notification: Notification) => {
    if (!notification.read) {
      void markRead(notification.id);
    }

    if (notification.data.type === 'follow' && notification.actor?.id) {
      router.push(`/profile/${notification.actor.id}`);
      return;
    }

    handleNotificationTap(notification.data);
  };

  if (loading && groups.length === 0) {
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={24} color={colors.textHi} />
            </Pressable>
            <Text style={styles.title}>Notifications</Text>
          </View>
        </View>
        <NotificationSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={24} color={colors.textHi} />
            </Pressable>
            <Text style={styles.title}>Notifications</Text>
          </View>
          <View style={styles.headerActions}>
            {hasUnread ? (
              <Pressable onPress={() => void markAllRead()} style={styles.headerButton} accessibilityRole="button">
                <Text style={styles.markAllRead}>Mark all read</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={() => router.push('/notification-settings')} style={styles.headerButton} accessibilityRole="button">
              <Ionicons name="settings-outline" size={22} color={colors.textMid} />
            </Pressable>
          </View>
        </View>

        {groups.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <NotificationList
            groups={groups}
            refreshing={refreshing}
            onRefresh={refresh}
            onEndReached={() => {
              if (hasMore) loadMore();
            }}
            loadingMore={loadingMore}
            onPressNotification={onPressNotification}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textHi,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 6,
  },
  markAllRead: {
    fontSize: 14,
    color: colors.brandPurple,
    fontWeight: '700',
  },
});



