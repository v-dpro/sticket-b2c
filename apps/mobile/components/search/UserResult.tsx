import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { UserResult as UserResultType } from '../../types/search';
import { followUser, unfollowUser } from '../../lib/api/users';
import { colors, radius, spacing } from '../../lib/theme';

interface UserResultProps {
  user: UserResultType;
  onPress?: () => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function UserResult({ user, onPress, onFollowChange }: UserResultProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    onPress?.();
    router.push(`/profile/${user.id}`);
  };

  const handleFollowPress = async (e: any) => {
    e?.stopPropagation?.();
    if (loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.id);
        setIsFollowing(false);
        onFollowChange?.(user.id, false);
      } else {
        await followUser(user.id);
        setIsFollowing(true);
        onFollowChange?.(user.id, true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Follow action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const display = user.displayName || user.username;

  return (
    <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{display.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {display}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{user.username}
        </Text>
        <Text style={styles.stats}>{user.showCount} shows logged</Text>
      </View>

      <Pressable
        style={[styles.followButton, isFollowing && styles.followingButton]}
        onPress={handleFollowPress}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.brandPurple : colors.textPrimary} />
        ) : (
          <Text style={[styles.followText, isFollowing && styles.followingText]}>{isFollowing ? 'Following' : 'Follow'}</Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.brandPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 1,
  },
  stats: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followButton: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 92,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.brandPurple,
  },
  followText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  followingText: {
    color: colors.brandPurple,
  },
});



