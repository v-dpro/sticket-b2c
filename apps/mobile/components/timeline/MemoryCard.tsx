// MemoryCard — a shared log with a photo: the photo memory. Image on top
// (16:10), co-author badge overlaid when present, then artist (800),
// venue · date (mute), score chip + like/comment counts (mono).

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { TimelineEntry } from '../../lib/api/timeline';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { ScoreChip } from './ScoreChip';
import { formatShortDate } from './format';

type MemoryCardProps = {
  entry: TimelineEntry;
  onPress: () => void;
};

function coAuthorLabel(entry: TimelineEntry): string {
  const [first, ...rest] = entry.coAuthors;
  if (!first) return '';
  return rest.length > 0 ? `w/ @${first.username} +${rest.length}` : `w/ @${first.username}`;
}

export function MemoryCard({ entry, onPress }: MemoryCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    photoWrap: {
      width: '100%',
      aspectRatio: 16 / 10,
      backgroundColor: t.colors.card2,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    coAuthorBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: t.colors.inverseBg,
      borderRadius: t.radius.full,
      paddingHorizontal: 9,
      height: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    coAuthorText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      color: t.colors.inverseFg,
    },
    body: {
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
    },
    artist: {
      fontSize: 16,
      fontWeight: '800',
      color: t.colors.fg,
    },
    meta: {
      fontSize: 12.5,
      fontWeight: '400',
      color: t.colors.mute,
      marginTop: 3,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
    },
    count: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    countText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '500',
      color: t.colors.mute,
    },
  }));

  const photo = entry.photos[0];
  const hasCoAuthors = entry.coAuthors.length > 0;

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`${entry.artist.name} at ${entry.venue.name}, shared memory`}
      style={styles.card}
    >
      <View style={styles.photoWrap}>
        {photo ? (
          <Image
            source={{ uri: photo.photoUrl || photo.thumbnailUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : null}
        {hasCoAuthors ? (
          <View style={styles.coAuthorBadge}>
            <Ionicons name="people" size={11} color={tokens.colors.inverseFg} />
            <Text style={styles.coAuthorText} numberOfLines={1}>
              {coAuthorLabel(entry)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.artist} numberOfLines={1}>
          {entry.artist.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {entry.venue.name} · {formatShortDate(entry.event.date)}
        </Text>

        <View style={styles.statsRow}>
          {typeof entry.score === 'number' ? <ScoreChip score={entry.score} /> : null}
          <View style={{ flex: 1 }} />
          {entry.likeCount > 0 ? (
            <View style={styles.count}>
              <Ionicons name="heart-outline" size={13} color={tokens.colors.mute} />
              <Text style={styles.countText}>{entry.likeCount}</Text>
            </View>
          ) : null}
          {entry.commentCount > 0 ? (
            <View style={styles.count}>
              <Ionicons name="chatbubble-outline" size={12} color={tokens.colors.mute} />
              <Text style={styles.countText}>{entry.commentCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SpringPressable>
  );
}
