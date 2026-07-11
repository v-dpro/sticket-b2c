import { Stack, useRouter } from 'expo-router';

// Stack route (was a hidden tab): pushed from the Home bell and
// notification taps, so it needs its own back affordance.
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SpringPressable } from '../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../lib/theme-context';
import { useNotifications } from '../hooks/useNotifications';
import { handleNotificationTap } from '../lib/notifications/notificationHandler';
import type { Notification } from '../types/notification';
import { EmptyNotifications } from '../components/notifications/EmptyNotifications';
import { NotificationSkeleton } from '../components/notifications/NotificationSkeleton';
import { NotificationList } from '../components/notifications/NotificationList';

export default function NotificationsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { groups, loading, refreshing, loadingMore, hasMore, refresh, loadMore, markRead, markAllRead } = useNotifications();

  const hasUnread = groups.some((g) => g.notifications.some((n) => !n.read));

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    container: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 28, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    headerButton: { padding: 6 },
    markAllRead: { fontSize: 14, color: t.colors.accent, fontWeight: '600' },
  }));

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

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <SpringPressable onPress={() => router.back()} haptic="light" hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <View style={styles.headerActions}>
        {hasUnread ? (
          <SpringPressable onPress={() => void markAllRead()} haptic="light" style={styles.headerButton} accessibilityRole="button">
            <Text style={styles.markAllRead}>Mark all read</Text>
          </SpringPressable>
        ) : null}

        <SpringPressable onPress={() => router.push('/notification-settings')} haptic="light" style={styles.headerButton} accessibilityRole="button">
          <Ionicons name="settings-outline" size={22} color={tokens.colors.mute} />
        </SpringPressable>
      </View>
    </View>
  );

  if (loading && groups.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <NotificationSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Header />

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
    </SafeAreaView>
  );
}
