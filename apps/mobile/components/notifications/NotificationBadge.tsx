import { Text, View } from 'react-native';

import { useNotificationStore } from '../../stores/notificationStore';
import { useThemedStyles } from '../../lib/theme-context';

interface NotificationBadgeProps {
  size?: 'small' | 'medium';
}

export function NotificationBadge({ size = 'small' }: NotificationBadgeProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const styles = useThemedStyles((t) => ({
    badge: {
      backgroundColor: t.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
    },
    badgeSmall: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      top: -4,
      right: -4,
    },
    badgeMedium: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      top: -6,
      right: -6,
    },
    text: {
      color: t.colors.onAccent, // white count over the red badge fill
      fontWeight: '900',
    },
    textSmall: {
      fontSize: 10,
    },
    textMedium: {
      fontSize: 12,
    },
  }));

  if (unreadCount === 0) return null;

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, isSmall ? styles.badgeSmall : styles.badgeMedium]}>
      <Text style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}>{displayCount}</Text>
    </View>
  );
}
