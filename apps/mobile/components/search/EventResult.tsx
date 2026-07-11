import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { format, isFuture, parseISO } from 'date-fns';

import type { EventResult as EventResultType } from '../../types/search';
import { spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface EventResultProps {
  event: EventResultType;
  onPress?: () => void;
}

export function EventResult({ event, onPress }: EventResultProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
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
      color: t.colors.textHi,
    },
    venue: {
      fontSize: 13,
      color: t.colors.textMid,
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
      color: t.colors.textLo,
    },
    dateUpcoming: {
      color: t.colors.success,
      fontWeight: '600',
    },
  }));

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
          <Ionicons name="musical-notes" size={20} color={tokens.colors.brandPink} />
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
          <Ionicons name={upcoming ? 'calendar' : 'time'} size={12} color={upcoming ? tokens.colors.success : tokens.colors.textLo} />
          <Text style={[styles.date, upcoming && styles.dateUpcoming]}>{format(eventDate, 'EEE, MMM d, yyyy')}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
    </Pressable>
  );
}
