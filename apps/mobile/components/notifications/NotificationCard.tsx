import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';

import type { Notification, NotificationType } from '../../types/notification';
import type { ThemeColors } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics } from '../../lib/motion';

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
}

const makeNotificationIcons = (
  colors: ThemeColors,
): Record<NotificationType, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> => ({
  follow: { name: 'person-add', color: colors.fg },
  comment: { name: 'chatbubble', color: colors.fg },
  tag: { name: 'pricetag', color: colors.warning },
  was_there: { name: 'checkmark-circle', color: colors.success },
  artist_show: { name: 'calendar', color: colors.fg },
  tickets_on_sale: { name: 'ticket', color: colors.warning },
  show_reminder: { name: 'alarm', color: colors.error },
  post_show: { name: 'star', color: colors.warning },
  friend_logged: { name: 'musical-notes', color: colors.fg },
});

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const { tokens } = useTheme();
  const icon = makeNotificationIcons(tokens.colors)[notification.type];
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: t.colors.inkAlt,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    unread: {
      backgroundColor: 'rgba(139, 92, 246, 0.08)',
    },
    iconContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    typeBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: t.colors.inkAlt,
    },
    content: {
      flex: 1,
    },
    body: {
      fontSize: 14,
      color: t.colors.textMid,
      lineHeight: 20,
    },
    actor: {
      fontWeight: '800',
      color: t.colors.textHi,
    },
    time: {
      fontSize: 12,
      color: t.colors.textLo,
      marginTop: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.colors.inverseBg,
      marginLeft: 8,
      marginTop: 8,
    },
  }));

  return (
    <Pressable
      style={[styles.container, !notification.read && styles.unread]}
      onPress={() => {
        haptics.light(); // navigation tick
        onPress();
      }}
    >
      <View style={styles.iconContainer}>
        {notification.actor?.avatarUrl ? (
          <Image source={{ uri: notification.actor.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>
        )}

        <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color={tokens.colors.onAccent} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.body}>
          {notification.actor ? <Text style={styles.actor}>@{notification.actor.username} </Text> : null}
          {notification.body}
        </Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </Text>
      </View>

      {!notification.read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}
