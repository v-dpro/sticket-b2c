import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FriendSaw } from '../../types/artist';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface FriendsWhoSawProps {
  friends: FriendSaw[];
  onFriendPress: (userId: string) => void;
}

export function FriendsWhoSaw({ friends, onFriendPress }: FriendsWhoSawProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      marginTop: 24,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: t.colors.textHi,
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
      borderColor: t.colors.brandPurple,
    },
    avatarPlaceholder: {
      backgroundColor: t.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: t.colors.brandPurple,
    },
    friendName: {
      fontSize: 12,
      color: t.colors.textMid,
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
      color: t.colors.brandPurple,
      fontWeight: '600',
    },
  }));

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
              <Ionicons name="musical-note" size={10} color={tokens.colors.brandPurple} />
              <Text style={styles.countText}>{friend.showCount}x</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
