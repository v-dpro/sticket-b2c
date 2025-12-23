import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import type { LogEntry } from '../../types/profile';
import { colors } from '../../lib/theme';

interface CompactLogCardProps {
  log: LogEntry;
  onPress: () => void;
  style?: any;
}

export function CompactLogCard({ log, onPress, style }: CompactLogCardProps) {
  const { event, rating, photos } = log;
  const imageUrl = photos?.[0]?.thumbnailUrl || photos?.[0]?.photoUrl || event.artist.imageUrl || undefined;
  const dateLabel = useMemo(() => format(new Date(event.date), 'MMM d'), [event.date]);

  return (
    <Pressable style={[styles.container, style]} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={18} color={colors.textTertiary} />
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
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={styles.ratingText}>{rating.toFixed(1).replace(/\.0$/, '')}</Text>
          </View>
        ) : (
          <View style={{ height: 14 }} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: 10,
  },
  artist: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  venue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.warning,
  },
});



