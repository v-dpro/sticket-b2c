import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FriendSuggestion, SuggestionReason } from '../../types/friends';
import { followUser, unfollowUser } from '../../lib/api/users';
import { colors, radius } from '../../lib/theme';
import { Avatar } from '../ui/Avatar';

type SuggestionCardProps = {
  suggestion: FriendSuggestion;
  onFollowChange: (userId: string, isFollowing: boolean) => void;
  onDismiss: (userId: string) => void;
};

function getReasonText(reason: SuggestionReason): string {
  switch (reason.type) {
    case 'mutual_friends':
      return `${reason.count} mutual friend${reason.count === 1 ? '' : 's'}`;
    case 'same_show':
      return `Also at ${reason.eventName}`;
    case 'same_artist':
      return `Both fans of ${reason.artistName}`;
    case 'popular':
      return `${reason.followerCount.toLocaleString()} followers`;
    default:
      return '';
  }
}

function getReasonIcon(reason: SuggestionReason): keyof typeof Ionicons.glyphMap {
  switch (reason.type) {
    case 'mutual_friends':
      return 'people';
    case 'same_show':
      return 'musical-notes';
    case 'same_artist':
      return 'heart';
    case 'popular':
      return 'star';
    default:
      return 'person';
  }
}

export function SuggestionCard({ suggestion, onFollowChange, onDismiss }: SuggestionCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    router.push(`/profile/${suggestion.id}`);
  };

  const handleFollowPress = async () => {
    setLoading(true);
    try {
      if (suggestion.isFollowing) {
        await unfollowUser(suggestion.id);
        onFollowChange(suggestion.id, false);
      } else {
        await followUser(suggestion.id);
        onFollowChange(suggestion.id, true);
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
      <Pressable
        style={styles.dismissButton}
        onPress={(e) => {
          e.stopPropagation();
          onDismiss(suggestion.id);
        }}
        hitSlop={10}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </Pressable>

      <Avatar uri={suggestion.avatarUrl} size={64} name={suggestion.displayName || suggestion.username} style={{ marginBottom: 12 }} />

      <Text style={styles.displayName} numberOfLines={1}>
        {suggestion.displayName || suggestion.username}
      </Text>
      <Text style={styles.username} numberOfLines={1}>
        @{suggestion.username}
      </Text>

      <View style={styles.reasonContainer}>
        <Ionicons name={getReasonIcon(suggestion.reason)} size={12} color={colors.brandPurple} />
        <Text style={styles.reasonText} numberOfLines={1}>
          {getReasonText(suggestion.reason)}
        </Text>
      </View>

      <Pressable
        style={[styles.followButton, suggestion.isFollowing && styles.followingButton]}
        onPress={(e) => {
          e.stopPropagation();
          void handleFollowPress();
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={suggestion.isFollowing ? colors.brandPurple : colors.textPrimary} />
        ) : (
          <Text style={[styles.followText, suggestion.isFollowing && styles.followingText]}>
            {suggestion.isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  username: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  reasonText: {
    fontSize: 11,
    color: colors.brandPurple,
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: 12,
    width: '100%',
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




