import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

import type { Event } from '../../types/event';
import { useInterested } from '../../hooks/useInterested';
import { colors, radius } from '../../lib/theme';

type Props = {
  event: Event;
};

export function EventRow({ event }: Props) {
  const router = useRouter();
  const { isInterested, toggle, loading } = useInterested(event.id, Boolean(event.isInterested));

  const formattedDate = useMemo(() => format(new Date(event.date), 'MMM d'), [event.date]);

  return (
    <Pressable onPress={() => router.push(`/event/${event.id}`)} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      {event.artist.imageUrl ? (
        <Image source={{ uri: event.artist.imageUrl }} style={styles.image} />
      ) : event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>{event.artist.name.charAt(0)}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.artistName} numberOfLines={1}>
          {event.artist.name}
        </Text>
        <Text style={styles.venueName} numberOfLines={1}>
          {event.venue.name} • {formattedDate}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isInterested ? 'Remove interest' : 'Mark interested'}
        onPress={toggle}
        disabled={loading}
        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name={isInterested ? 'heart' : 'heart-outline'} size={18} color={isInterested ? colors.brandPink : colors.textTertiary} />
      </Pressable>

      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textTertiary,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  venueName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
  },
});




