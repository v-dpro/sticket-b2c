import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { UserSearchResult as UserSearchResultType } from '../../types/friends';
import { followUser, unfollowUser } from '../../lib/api/users';
import { radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics } from '../../lib/motion';
import { Avatar } from '../ui/Avatar';

type UserSearchResultProps = {
  user: UserSearchResultType;
  onFollowChange: (userId: string, isFollowing: boolean) => void;
};

export function UserSearchResult({ user, onFollowChange }: UserSearchResultProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    info: {
      flex: 1,
    },
    displayName: {
      fontSize: 16,
      fontWeight: '700',
      color: t.colors.textHi,
    },
    username: {
      fontSize: 13,
      color: t.colors.textLo,
      marginTop: 1,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: t.colors.textLo,
    },
    followsYouBadge: {
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm,
    },
    followsYouText: {
      fontSize: 10,
      color: t.colors.brandPurple,
      fontWeight: '700',
    },
    followButton: {
      backgroundColor: t.colors.brandPurple,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.full,
      minWidth: 96,
      alignItems: 'center',
    },
    followingButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.colors.brandPurple,
    },
    followText: {
      fontSize: 13,
      fontWeight: '800',
      color: t.colors.onAccent, // label over the filled purple button
    },
    followingText: {
      color: t.colors.brandPurple,
    },
  }));

  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    haptics.light(); // navigation tick
    router.push(`/profile/${user.id}`);
  };

  const handleFollowPress = async () => {
    setLoading(true);
    try {
      if (user.isFollowing) {
        await unfollowUser(user.id);
        onFollowChange(user.id, false);
      } else {
        await followUser(user.id);
        onFollowChange(user.id, true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Follow action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Avatar uri={user.avatarUrl} size={50} name={user.displayName || user.username} style={{ marginRight: 12 }} />

      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{user.username}
        </Text>

        <View style={styles.meta}>
          {user.mutualFriends > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="people" size={12} color={tokens.colors.textLo} />
              <Text style={styles.metaText}>{user.mutualFriends} mutual</Text>
            </View>
          ) : null}
          {user.showCount > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="musical-notes" size={12} color={tokens.colors.textLo} />
              <Text style={styles.metaText}>{user.showCount} shows</Text>
            </View>
          ) : null}
          {user.isFollowingYou ? (
            <View style={styles.followsYouBadge}>
              <Text style={styles.followsYouText}>Follows you</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        style={[styles.followButton, user.isFollowing && styles.followingButton]}
        onPress={(e) => {
          e.stopPropagation();
          void handleFollowPress();
        }}
        disabled={loading}
        hitSlop={6}
      >
        {loading ? (
          <ActivityIndicator size="small" color={user.isFollowing ? tokens.colors.brandPurple : tokens.colors.onAccent} />
        ) : (
          <Text style={[styles.followText, user.isFollowing && styles.followingText]}>
            {user.isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}
