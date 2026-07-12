// SeatSectionTiles — the event page "seat views" map: a 2-column grid of
// section tiles. Each tile paints the section's first photo as its
// background (card2 when the section has none) with the section name (800)
// and a mono "N PHOTOS · ★4.2" line overlaid. Over-photo text rides the
// feed's literal scrim treatment (rgba(11,11,16,…)); photo-less tiles fall
// back to theme tokens so both modes stay legible.

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ImageBackground } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { EventSeatSection } from '../../lib/api/events';
import { durations } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore } from './format';

type SeatSectionTilesProps = {
  sections: EventSeatSection[];
  onPressSection: (section: EventSeatSection) => void;
};

function metaLine(section: EventSeatSection): string {
  const photos = `${section.photoCount} ${section.photoCount === 1 ? 'PHOTO' : 'PHOTOS'}`;
  if (section.avgRating != null && Number.isFinite(section.avgRating)) {
    return `${photos} · ★${formatScore(section.avgRating)}`;
  }
  return photos;
}

// Memoized: `sections` is replaced by identity on refetch and the event page
// passes a stable state setter as `onPressSection`, so shallow compare holds.
export const SeatSectionTiles = memo(function SeatSectionTiles({
  sections,
  onPressSection,
}: SeatSectionTilesProps) {
  const styles = useThemedStyles((t) => ({
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
    cell: { width: '50%', padding: 5 },
    tile: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: t.radius.md,
      overflow: 'hidden',
      backgroundColor: t.colors.card2,
    },
    // Literal feed scrim family — fixed light-on-dark over photos, both modes.
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(11,11,16,0.35)',
    },
    scrimBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '55%',
      backgroundColor: 'rgba(11,11,16,0.4)',
    },
    inner: { flex: 1, justifyContent: 'flex-end', padding: 12 },
    nameOnPhoto: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: '#FFFFFF',
    },
    metaOnPhoto: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.8,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 4,
    },
    // Photo-less tile — theme tokens instead of the scrim treatment.
    nameOnCard: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: t.colors.fg,
    },
    metaOnCard: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.8,
      color: t.colors.mute,
      marginTop: 4,
    },
  }));

  return (
    <View style={styles.grid}>
      {sections.map((section, i) => {
        const cover = section.photos[0];
        const coverUri = cover ? (cover.thumbnailUrl ?? cover.photoUrl) : null;
        const label = `Section ${section.section}, ${metaLine(section)}`;

        const inner = (
          <View style={styles.inner}>
            <Text style={coverUri ? styles.nameOnPhoto : styles.nameOnCard} numberOfLines={1}>
              {section.section}
            </Text>
            <Text style={coverUri ? styles.metaOnPhoto : styles.metaOnCard} numberOfLines={1}>
              {metaLine(section)}
            </Text>
          </View>
        );

        return (
          <Animated.View
            key={section.section}
            entering={FadeInDown.delay(Math.min(i, 8) * durations.stagger).duration(240)}
            style={styles.cell}
          >
            <SpringPressable
              haptic="light"
              onPress={() => onPressSection(section)}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={styles.tile}
            >
              {coverUri ? (
                <ImageBackground
                  source={{ uri: coverUri }}
                  style={{ flex: 1 }}
                  contentFit="cover"
                  transition={80}
                  cachePolicy="memory-disk"
                >
                  <View style={styles.scrim} pointerEvents="none" />
                  <View style={styles.scrimBottom} pointerEvents="none" />
                  {inner}
                </ImageBackground>
              ) : (
                inner
              )}
            </SpringPressable>
          </Animated.View>
        );
      })}
    </View>
  );
});
