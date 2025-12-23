import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

import type { Event } from '../../types/event';
import { useInterested } from '../../hooks/useInterested';
import { colors, gradients, radius } from '../../lib/theme';

type Props = {
  event: Event;
  showFriends?: boolean;
};

export function EventCard({ event, showFriends = false }: Props) {
  const router = useRouter();
  const { isInterested, toggle, loading } = useInterested(event.id, Boolean(event.isInterested));

  const formattedDate = useMemo(() => format(new Date(event.date), 'MMM d'), [event.date]);

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.imageContainer}>
        {event.artist.imageUrl ? (
          <Image source={{ uri: event.artist.imageUrl }} style={styles.image} />
        ) : event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>{event.artist.name.charAt(0)}</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isInterested ? 'Remove interest' : 'Mark interested'}
          onPress={toggle}
          disabled={loading}
          style={({ pressed }) => [styles.heartButton, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name={isInterested ? 'heart' : 'heart-outline'} size={18} color={isInterested ? colors.brandPink : colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={styles.artistName} numberOfLines={1}>
          {event.artist.name}
        </Text>
        <Text style={styles.venueName} numberOfLines={1}>
          {event.venue.name}
        </Text>

        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dateBadge}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </LinearGradient>

        {showFriends && (event.friendsGoingCount ?? 0) > 0 && (
          <View style={styles.friendsRow}>
            <View style={styles.avatarStack}>
              {(event.friendsGoing ?? []).slice(0, 3).map((friend, index) => (
                <View key={friend.id} style={[styles.friendAvatar, { marginLeft: index === 0 ? 0 : -8 }]}>
                  {friend.avatarUrl ? (
                    <Image source={{ uri: friend.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={styles.friendAvatarFallback}>
                      <Text style={styles.friendAvatarFallbackText}>{friend.username.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.friendsText}>{event.friendsGoingCount} going</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 156,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    height: 156,
    backgroundColor: colors.surfaceElevated,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textTertiary,
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 11, 30, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  info: {
    padding: 12,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  venueName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 20,
    height: 20,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceElevated,
  },
  friendAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  friendAvatarFallbackText: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '900',
  },
  friendsText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brandCyan,
  },
});




