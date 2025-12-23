import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { Avatar } from '../ui/Avatar';
import { colors } from '../../lib/theme';

interface FeedCardHeaderProps {
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  onUserPress: () => void;
}

export function FeedCardHeader({ user, createdAt, onUserPress }: FeedCardHeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.userInfo} onPress={onUserPress} accessibilityRole="button">
        <Avatar uri={user.avatarUrl} name={user.displayName || user.username} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName} numberOfLines={1}>
            {user.displayName || user.username}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{user.username}
          </Text>
        </View>
      </Pressable>

      <Text style={styles.timestamp}>
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 1,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});



