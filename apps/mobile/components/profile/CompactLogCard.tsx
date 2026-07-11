import React, { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import type { LogEntry } from '../../types/profile';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface CompactLogCardProps {
  log: LogEntry;
  onPress: () => void;
  style?: any;
}

export function CompactLogCard({ log, onPress, style }: CompactLogCardProps) {
  const { tokens } = useTheme();
  const { event, rating, photos } = log;
  const imageUrl = photos?.[0]?.thumbnailUrl || photos?.[0]?.photoUrl || event.artist.imageUrl || undefined;
  const dateLabel = useMemo(() => format(new Date(event.date), 'MMM d'), [event.date]);

  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      backgroundColor: t.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    imageWrap: {
      position: 'relative',
    },
    image: {
      width: '100%',
      height: 120,
    },
    imagePlaceholder: {
      backgroundColor: t.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePill: {
      position: 'absolute',
      left: 8,
      top: 8,
      backgroundColor: 'rgba(0,0,0,0.55)', // dark scrim over image
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    dateText: {
      color: t.colors.white, // over dark scrim pill
      fontSize: 11,
      fontWeight: '700',
    },
    body: {
      padding: 10,
    },
    artist: {
      fontSize: 13,
      fontWeight: '800',
      color: t.colors.textHi,
      marginBottom: 2,
    },
    venue: {
      fontSize: 12,
      fontWeight: '600',
      color: t.colors.textMid,
      marginBottom: 6,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '700',
      color: t.colors.warning,
    },
  }));

  return (
    <Pressable style={[styles.container, style]} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={18} color={tokens.colors.textLo} />
          </View>
        )}
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.artist} numberOfLines={1}>
          {event.artist.name}
        </Text>
        <Text style={styles.venue} numberOfLines={1}>
          {event.venue.name}
        </Text>
        {typeof rating === 'number' ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={tokens.colors.warning} />
            <Text style={styles.ratingText}>{rating.toFixed(1).replace(/\.0$/, '')}</Text>
          </View>
        ) : (
          <View style={{ height: 14 }} />
        )}
      </View>
    </Pressable>
  );
}
