import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FriendSaw } from '../../types/artist';

interface FriendsWhoSawProps {
  friends: FriendSaw[];
  onFriendPress: (userId: string) => void;
}

export function FriendsWhoSaw({ friends, onFriendPress }: FriendsWhoSawProps) {
  if (friends.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends who've seen them</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {friends.map((friend) => (
          <Pressable key={friend.id} style={styles.friendCard} onPress={() => onFriendPress(friend.id)}>
            {friend.avatarUrl ? (
              <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{(friend.displayName || friend.username).charAt(0)}</Text>
              </View>
            )}

            <Text style={styles.friendName} numberOfLines={1}>
              {friend.displayName || friend.username}
            </Text>

            <View style={styles.countBadge}>
              <Ionicons name="musical-note" size={10} color="#8B5CF6" />
              <Text style={styles.countText}>{friend.showCount}x</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  friendCard: {
    alignItems: 'center',
    width: 80,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  avatarPlaceholder: {
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  friendName: {
    fontSize: 12,
    color: '#A0A0B8',
    textAlign: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  countText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});



