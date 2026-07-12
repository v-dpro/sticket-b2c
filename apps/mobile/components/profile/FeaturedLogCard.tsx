import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import type { LogEntry } from '../../types/profile';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface FeaturedLogCardProps {
  log: LogEntry;
  onPress: () => void;
}

export function FeaturedLogCard({ log, onPress }: FeaturedLogCardProps) {
  const { tokens } = useTheme();
  const { event, rating, note, photos, _count } = log;

  const imageUrl = photos?.[0]?.thumbnailUrl || photos?.[0]?.photoUrl || event.artist.imageUrl || undefined;
  const formattedDate = useMemo(() => format(new Date(event.date), 'MMM d, yyyy'), [event.date]);

  const styles = useThemedStyles((t) => ({
    container: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: t.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.colors.hairline,
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
      backgroundColor: t.colors.hairline,
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
      backgroundColor: 'rgba(0,0,0,0.65)', // dark scrim over image
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    photoBadgeText: {
      color: t.colors.white, // over dark scrim badge
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
      color: t.colors.textHi,
    },
    meta: {
      fontSize: 13,
      fontWeight: '600',
      color: t.colors.textMid,
      marginBottom: 2,
    },
    date: {
      fontSize: 12,
      color: t.colors.textLo,
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
      color: t.colors.warning,
      fontSize: 12,
      fontWeight: '700',
    },
    comments: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentText: {
      color: t.colors.textLo,
      fontSize: 12,
      fontWeight: '600',
    },
    note: {
      marginTop: 6,
      color: t.colors.textMid,
      fontSize: 13,
      lineHeight: 18,
    },
  }));

  return (
    <Pressable style={styles.container} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={28} color={tokens.colors.textLo} />
          </View>
        )}

        {photos?.length > 1 ? (
          <View style={styles.photoBadge}>
            <Ionicons name="images" size={12} color={tokens.colors.white} />
            <Text style={styles.photoBadgeText}>{photos.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.artist} numberOfLines={1}>
            {event.artist.name}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {event.venue.name} • {event.venue.city}
        </Text>
        <Text style={styles.date}>{formattedDate}</Text>

        <View style={styles.bottomRow}>
          {typeof rating === 'number' ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={tokens.colors.warning} />
              <Text style={styles.ratingText}>{rating.toFixed(1).replace(/\.0$/, '')}</Text>
            </View>
          ) : null}

          {_count?.comments ? (
            <View style={styles.comments}>
              <Ionicons name="chatbubble-outline" size={14} color={tokens.colors.textLo} />
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
