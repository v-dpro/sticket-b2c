import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { NotificationBadge } from './NotificationBadge';
import { colors } from '../../lib/theme';

type NotificationBellButtonProps = {
  color?: string;
  size?: number;
  badgeSize?: 'small' | 'medium';
};

export function NotificationBellButton({ color = colors.textPrimary, size = 24, badgeSize = 'small' }: NotificationBellButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <View>
        <Ionicons name="notifications-outline" size={size} color={color} />
        <NotificationBadge size={badgeSize} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    position: 'relative',
  },
});



