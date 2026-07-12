// MemoryCard — a shared log with a photo: the photo IS the memory (A19).
// Full-bleed image (height ≈ 63% of width), radius 22, bottom scrim; all
// text lives ON the photo: artist 21/800 white bottom-left, venue · date
// in uppercase letterspaced mono below it, score chip top-right (optional
// "#1 OF N" rank chip top-left), like/comment counts as a small mono line
// bottom-right inside the scrim. No caption furniture below the card.
//
// The scrim and over-photo chip colors are deliberately literal — they sit
// on top of a photo and are theme-independent by design (per the handoff).

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { TimelineEntry } from '../../lib/api/timeline';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore, formatShortDate } from './format';

type MemoryCardProps = {
  entry: TimelineEntry;
  onPress: () => void;
  /**
   * "#1 OF 47" chip, top-left. Only pass a real rank (the screen computes it
   * from complete score data) — never fabricate one.
   */
  rankLabel?: string | null;
};

// Over-photo constants (theme-independent — they overlay the image).
const SCRIM_COLORS = ['rgba(11,11,16,0)', 'rgba(11,11,16,0.88)'] as const;
const SCRIM_LOCATIONS = [0.4, 1] as const;
const OVERLAY_MUTE = '#C9C9D4';
const CHIP_BG = 'rgba(11,11,16,0.55)';
const CHIP_BORDER = 'rgba(255,255,255,0.16)';

function coAuthorLabel(entry: TimelineEntry): string {
  const [first, ...rest] = entry.coAuthors;
  if (!first) return '';
  return rest.length > 0 ? `w/ @${first.username} +${rest.length}` : `w/ @${first.username}`;
}

export function MemoryCard({ entry, onPress, rankLabel }: MemoryCardProps) {
  const styles = useThemedStyles((t) => ({
    card: {
      width: '100%',
      // Height ≈ 63% of width (~216pt at 340pt wide).
      aspectRatio: 100 / 63,
      borderRadius: t.radius.xl, // 22
      overflow: 'hidden',
      backgroundColor: t.colors.card2, // shows while the photo loads
    },
    photo: {
      ...StyleSheet.absoluteFillObject,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
    },
    topRow: {
      position: 'absolute',
      top: 12,
      left: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    chip: {
      backgroundColor: CHIP_BG,
      borderWidth: 1,
      borderColor: CHIP_BORDER,
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    chipText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    bottomBlock: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 12,
    },
    artist: {
      fontSize: 21,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    meta: {
      flex: 1,
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: OVERLAY_MUTE,
    },
    counts: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    count: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    countText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      color: OVERLAY_MUTE,
    },
  }));

  const photo = entry.photos[0];
  const coAuthors = coAuthorLabel(entry);
  const metaParts = [
    `${entry.venue.name} · ${formatShortDate(entry.event.date)}`,
    coAuthors || null,
  ].filter(Boolean);

  const a11yParts = [
    `${entry.artist.name} at ${entry.venue.name}, shared memory`,
    typeof entry.score === 'number' ? `scored ${formatScore(entry.score)}` : null,
    rankLabel ? `ranked ${rankLabel.toLowerCase()}` : null,
  ].filter(Boolean);

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={a11yParts.join(', ')}
      style={styles.card}
    >
      {photo ? (
        <Image
          source={{ uri: photo.photoUrl || photo.thumbnailUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}

      {/* Bottom scrim: transparent until 40%, then settles to near-ink. */}
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.scrim}
        pointerEvents="none"
      />

      <View style={styles.topRow} pointerEvents="none">
        {rankLabel ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{rankLabel}</Text>
          </View>
        ) : (
          <View />
        )}
        {typeof entry.score === 'number' ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{formatScore(entry.score)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomBlock} pointerEvents="none">
        <Text style={styles.artist} numberOfLines={1}>
          {entry.artist.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {metaParts.join(' · ')}
          </Text>
          {entry.likeCount > 0 || entry.commentCount > 0 ? (
            <View style={styles.counts}>
              {entry.likeCount > 0 ? (
                <View style={styles.count}>
                  <Ionicons name="heart" size={11} color={OVERLAY_MUTE} />
                  <Text style={styles.countText}>{entry.likeCount}</Text>
                </View>
              ) : null}
              {entry.commentCount > 0 ? (
                <View style={styles.count}>
                  <Ionicons name="chatbubble" size={10} color={OVERLAY_MUTE} />
                  <Text style={styles.countText}>{entry.commentCount}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </SpringPressable>
  );
}
