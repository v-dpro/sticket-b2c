import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import type { LogEntry } from '../../types/profile';
import { colors } from '../../lib/theme';

interface FeaturedLogCardProps {
  log: LogEntry;
  onPress: () => void;
}

export function FeaturedLogCard({ log, onPress }: FeaturedLogCardProps) {
  const { event, rating, note, photos, _count } = log;

  const imageUrl = photos?.[0]?.thumbnailUrl || photos?.[0]?.photoUrl || event.artist.imageUrl || undefined;
  const formattedDate = useMemo(() => format(new Date(event.date), 'MMM d, yyyy'), [event.date]);

  return (
    <Pressable style={styles.container} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={28} color={colors.textTertiary} />
          </View>
        )}

        {photos?.length > 1 ? (
          <View style={styles.photoBadge}>
            <Ionicons name="images" size={12} color="#FFFFFF" />
            <Text style={styles.photoBadgeText}>{photos.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.artist} numberOfLines={1}>
            {event.artist.name}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {event.venue.name} • {event.venue.city}
        </Text>
        <Text style={styles.date}>{formattedDate}</Text>

        <View style={styles.bottomRow}>
          {typeof rating === 'number' ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.ratingText}>{rating.toFixed(1).replace(/\.0$/, '')}</Text>
            </View>
          ) : null}

          {_count?.comments ? (
            <View style={styles.comments}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.commentText}>{_count.comments}</Text>
            </View>
          ) : null}
        </View>

        {note ? (
          <Text style={styles.note} numberOfLines={3}>
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: 190,
  },
  imagePlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  artist: {
    flex: 1,
    paddingRight: 10,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  comments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  note: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});



