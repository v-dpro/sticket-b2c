import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ContactMatch } from '../../types/friends';
import { followUser, unfollowUser } from '../../lib/api/users';
import { colors, radius } from '../../lib/theme';
import { Avatar } from '../ui/Avatar';

type ContactCardProps = {
  contact: ContactMatch;
  onFollowChange: (userId: string, isFollowing: boolean) => void;
};

export function ContactCard({ contact, onFollowChange }: ContactCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    router.push(`/profile/${contact.id}`);
  };

  const handleFollowPress = async () => {
    setLoading(true);
    try {
      if (contact.isFollowing) {
        await unfollowUser(contact.id);
        onFollowChange(contact.id, false);
      } else {
        await followUser(contact.id);
        onFollowChange(contact.id, true);
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
      <Avatar uri={contact.avatarUrl} size={50} name={contact.displayName || contact.username} style={{ marginRight: 12 }} />

      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {contact.displayName || contact.username}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{contact.username}
        </Text>

        <View style={styles.contactBadge}>
          <Ionicons name="person" size={10} color={colors.brandCyan} />
          <Text style={styles.contactName} numberOfLines={1}>
            {contact.contactName} in contacts
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.followButton, contact.isFollowing && styles.followingButton]}
        onPress={(e) => {
          e.stopPropagation();
          void handleFollowPress();
        }}
        disabled={loading}
        hitSlop={6}
      >
        {loading ? (
          <ActivityIndicator size="small" color={contact.isFollowing ? colors.brandPurple : colors.textPrimary} />
        ) : (
          <Text style={[styles.followText, contact.isFollowing && styles.followingText]}>
            {contact.isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 1,
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  contactName: {
    fontSize: 12,
    color: colors.brandCyan,
    flex: 1,
  },
  followButton: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 96,
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




