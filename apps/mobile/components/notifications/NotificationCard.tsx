import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';

import type { Notification, NotificationType } from '../../types/notification';
import { colors } from '../../lib/theme';

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  follow: { name: 'person-add', color: colors.brandPurple },
  comment: { name: 'chatbubble', color: colors.brandCyan },
  tag: { name: 'pricetag', color: colors.warning },
  was_there: { name: 'checkmark-circle', color: colors.success },
  artist_show: { name: 'calendar', color: colors.brandPink },
  tickets_on_sale: { name: 'ticket', color: colors.warning },
  show_reminder: { name: 'alarm', color: colors.error },
  post_show: { name: 'star', color: colors.warning },
  friend_logged: { name: 'musical-notes', color: colors.brandPurple },
};

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const icon = NOTIFICATION_ICONS[notification.type];

  return (
    <Pressable style={[styles.container, !notification.read && styles.unread]} onPress={onPress}>
      <View style={styles.iconContainer}>
        {notification.actor?.avatarUrl ? (
          <Image source={{ uri: notification.actor.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>
        )}

        <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color={colors.textPrimary} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    borderColor: colors.backgroundAlt,
  },
  content: {
    flex: 1,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actor: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandPurple,
    marginLeft: 8,
    marginTop: 8,
  },
});



