// TimelineMapView — the zoomed-out 2D map of the timeline: the whole
// thing on one page. Year sections (mono "2026 · 12 SHOWS" headers), each
// a 2-col grid of month tiles; every logged show / future plan is a small
// marker inside its month:
//   photo thumbnail (26px rounded) — shared log with a photo
//   accent dot                     — logged, no shared photo
//   dashed ring                    — future plan (tiny 🎉 when it's a party)
// Tapping any marker flies back to the scroll view at that entry (the
// parent owns the mode switch + scrollToIndex). Derives everything from
// the scroll view's already-fetched data — no fetching here.

import React, { useMemo } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { TimelineMonth, TimelineUpcomingItem } from '../../lib/api/timeline';
import { durations } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { buildMapModel, type MapMarker, type MapMonthTile, type MapYearSection } from './mapModel';

const MARKER_CELL = 26; // px — photo thumbnails fill it; dots/rings center in it
// Tiles past this index mount without the entrance stagger.
const STAGGER_CUTOFF = 14;

type TimelineMapViewProps = {
  upcoming: TimelineUpcomingItem[];
  months: TimelineMonth[];
  /** True while the parent is backfilling older pages so the map is complete. */
  loadingAll: boolean;
  /** Marker keys are the scroll view's row keys — fly back to that row. */
  onPressMarker: (rowKey: string) => void;
};

function yearHeaderLabel(section: MapYearSection): string {
  if (section.loggedCount === 0 && section.plannedCount > 0) {
    return `${section.year} · ${section.plannedCount} PLANNED`;
  }
  return `${section.year} · ${section.loggedCount} ${section.loggedCount === 1 ? 'SHOW' : 'SHOWS'}`;
}

function Marker({ marker, onPress }: { marker: MapMarker; onPress: () => void }) {
  const styles = useThemedStyles(buildStyles);

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={marker.label}
      style={styles.markerCell}
    >
      {marker.kind === 'photo' ? (
        <Image source={{ uri: marker.thumbnailUrl }} style={styles.photoThumb} />
      ) : marker.kind === 'dot' ? (
        <View style={styles.loggedDot} />
      ) : (
        <>
          <View style={styles.planRing} />
          {marker.isParty ? (
            // Party plans — unreachable until the API grows a party flag.
            <Text style={styles.partyMark}>🎉</Text>
          ) : null}
        </>
      )}
    </SpringPressable>
  );
}

function MonthTile({
  tile,
  index,
  onPressMarker,
}: {
  tile: MapMonthTile;
  index: number;
  onPressMarker: (rowKey: string) => void;
}) {
  const styles = useThemedStyles(buildStyles);
  const entering = FadeInDown.duration(300).delay(
    index < STAGGER_CUTOFF ? index * durations.stagger : 0,
  );

  return (
    <Animated.View entering={entering} style={styles.tile}>
      <Text style={styles.tileLabel}>{tile.monthAbbr}</Text>
      <View style={styles.markerRow}>
        {tile.markers.map((marker) => (
          <Marker key={marker.key} marker={marker} onPress={() => onPressMarker(marker.key)} />
        ))}
      </View>
    </Animated.View>
  );
}

export function TimelineMapView({
  upcoming,
  months,
  loadingAll,
  onPressMarker,
}: TimelineMapViewProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const sections = useMemo(() => buildMapModel(upcoming, months), [upcoming, months]);

  // Global tile index across sections — drives the entrance stagger.
  let tileIndex = 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => (
        <View key={section.year} style={styles.yearSection}>
          <View style={styles.yearHeader}>
            <Text style={styles.yearLabel}>{yearHeaderLabel(section)}</Text>
            <View style={styles.yearRule} />
          </View>
          <View style={styles.grid}>
            {section.months.map((tile) => (
              <MonthTile
                key={tile.key}
                tile={tile}
                index={tileIndex++}
                onPressMarker={onPressMarker}
              />
            ))}
          </View>
        </View>
      ))}

      {loadingAll ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={tokens.colors.mute} />
          <Text style={styles.loadingText}>LOADING FULL HISTORY</Text>
        </View>
      ) : null}

      <Text style={styles.legend}>Thumbnails = shared · dots = logged · dashed = planned</Text>
    </ScrollView>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: tokens.density.pad,
      paddingTop: 16,
      paddingBottom: 48,
    },
    yearSection: {
      marginBottom: 22,
    },
    yearHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    yearLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: tokens.colors.mute,
    },
    yearRule: {
      flex: 1,
      height: 1,
      backgroundColor: tokens.colors.hairline,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    tile: {
      width: '48%',
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.colors.hairline,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    tileLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: tokens.colors.mute,
    },
    markerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    markerCell: {
      width: MARKER_CELL,
      height: MARKER_CELL,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoThumb: {
      width: MARKER_CELL,
      height: MARKER_CELL,
      borderRadius: 7,
      backgroundColor: tokens.colors.card2,
    },
    loggedDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: tokens.colors.accent,
    },
    planRing: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: tokens.colors.mute,
    },
    partyMark: {
      position: 'absolute',
      top: -2,
      right: -2,
      fontSize: 8,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    loadingText: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: tokens.colors.mute,
    },
    legend: {
      fontSize: 11,
      fontWeight: '400',
      color: tokens.colors.muteSoft,
      textAlign: 'center',
      marginTop: 10,
    },
  });
