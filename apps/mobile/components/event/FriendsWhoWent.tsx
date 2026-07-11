import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { FriendAttendee } from '../../types/event';
import { radius, fontFamilies } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface FriendsWhoWentProps {
  friends: FriendAttendee[];
  onFriendPress: (userId: string) => void;
  onSeeAllPress: () => void;
}

export function FriendsWhoWent({ friends, onFriendPress, onSeeAllPress }: FriendsWhoWentProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    section: {
      marginTop: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    sectionLabel: {
      fontFamily: fontFamilies.monoMedium,
      fontSize: 10.5,
      fontWeight: '500',
      letterSpacing: 2,
      color: t.colors.textLo,
    },
    seeAll: {
      fontSize: 13,
      color: t.colors.cyan,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingVertical: 14,
    },
    scrollContent: {
      paddingHorizontal: 14,
      gap: 14,
    },
    friendItem: {
      alignItems: 'center',
      width: 64,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginBottom: 6,
    },
    avatarPlaceholder: {
      backgroundColor: t.colors.elevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontSize: 16,
      fontWeight: '700',
      color: t.colors.textMid,
    },
    name: {
      fontSize: 11,
      color: t.colors.textMid,
      textAlign: 'center',
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      gap: 2,
    },
    ratingText: {
      fontSize: 10,
      color: t.colors.warning,
      fontWeight: '600',
    },
  }));

  if (!friends.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>FRIENDS WHO WENT</Text>
        {friends.length > 5 ? (
          <Pressable onPress={onSeeAllPress}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {friends.slice(0, 10).map((friend) => (
            <Pressable key={friend.id} style={styles.friendItem} onPress={() => onFriendPress(friend.id)}>
              {friend.avatarUrl ? (
                <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {(friend.displayName || friend.username).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>
                {friend.displayName || friend.username}
              </Text>
              {typeof friend.rating === 'number' ? (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={9} color={tokens.colors.warning} />
                  <Text style={styles.ratingText}>{friend.rating}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
