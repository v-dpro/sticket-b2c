import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { format, isFuture, parseISO } from 'date-fns';

import type { EventResult as EventResultType } from '../../types/search';
import { colors, spacing } from '../../lib/theme';

interface EventResultProps {
  event: EventResultType;
  onPress?: () => void;
}

export function EventResult({ event, onPress }: EventResultProps) {
  const router = useRouter();

  const eventDate = parseISO(event.date);
  const upcoming = isFuture(eventDate);

  const handlePress = () => {
    onPress?.();
    router.push(`/event/${event.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="musical-notes" size={20} color={colors.brandPink} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.artist} numberOfLines={1}>
          {event.artist.name}
        </Text>
        <Text style={styles.venue} numberOfLines={1}>
          {event.venue.name}, {event.venue.city}
        </Text>
        <View style={styles.dateRow}>
          <Ionicons name={upcoming ? 'calendar' : 'time'} size={12} color={upcoming ? colors.success : colors.textTertiary} />
          <Text style={[styles.date, upcoming && styles.dateUpcoming]}>{format(eventDate, 'EEE, MMM d, yyyy')}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
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
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: spacing.md - 4,
  },
  imagePlaceholder: {
    backgroundColor: 'rgba(232, 121, 249, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  artist: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  venue: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  dateUpcoming: {
    color: colors.success,
    fontWeight: '600',
  },
});



