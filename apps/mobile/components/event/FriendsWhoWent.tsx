import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { FriendAttendee } from '../../types/event';
import { colors } from '../../lib/theme';

interface FriendsWhoWentProps {
  friends: FriendAttendee[];
  onFriendPress: (userId: string) => void;
  onSeeAllPress: () => void;
}

export function FriendsWhoWent({ friends, onFriendPress, onSeeAllPress }: FriendsWhoWentProps) {
  if (!friends.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends who went</Text>
        {friends.length > 5 ? (
          <Pressable onPress={onSeeAllPress}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {friends.slice(0, 10).map((friend) => (
          <Pressable key={friend.id} style={styles.friendCard} onPress={() => onFriendPress(friend.id)}>
            {friend.avatarUrl ? (
              <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{(friend.displayName || friend.username).charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.username} numberOfLines={1}>
              {friend.displayName || friend.username}
            </Text>
            {typeof friend.rating === 'number' ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color={colors.warning} />
                <Text style={styles.ratingText}>{friend.rating}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHi,
  },
  seeAll: {
    fontSize: 14,
    color: colors.brandCyan,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  friendCard: {
    alignItems: 'center',
    width: 72,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: colors.brandPurple,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brandPurple,
  },
  username: {
    fontSize: 12,
    color: colors.textMid,
    textAlign: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '600',
  },
});



