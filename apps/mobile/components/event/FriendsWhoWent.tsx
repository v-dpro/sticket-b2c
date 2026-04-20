import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { FriendAttendee } from '../../types/event';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';

interface FriendsWhoWentProps {
  friends: FriendAttendee[];
  onFriendPress: (userId: string) => void;
  onSeeAllPress: () => void;
}

export function FriendsWhoWent({ friends, onFriendPress, onSeeAllPress }: FriendsWhoWentProps) {
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
                  <Ionicons name="star" size={9} color={colors.warning} />
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

const styles = StyleSheet.create({
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
    color: colors.textLo,
  },
  seeAll: {
    fontSize: 13,
    color: accentSets.cyan.hex,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
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
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMid,
  },
  name: {
    fontSize: 11,
    color: colors.textMid,
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
    color: colors.warning,
    fontWeight: '600',
  },
});
