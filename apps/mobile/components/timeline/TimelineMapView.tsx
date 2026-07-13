// TimelineMapView — an Instagram-profile-style GRID overview of the whole
// timeline: 3 columns, bigger photos than a thumbnail strip but compact
// enough to scan months at a glance. "UPCOMING" (dashed countdown cells)
// leads, then months newest-first under big mono headers with a hairline
// rule. Cell bodies:
//   photo cell    — shared log w/ a photo: full-bleed image, BareScore
//                   bottom-right over a tiny corner scrim.
//   entry cell    — logged, no shared photo: card2 fill, artist initial
//                   (800), mono score underneath.
//   plan cell     — upcoming: dashed tokens.colors.dash border, mono
//                   countdown ("21D") centered.
// mapModel.ts pre-chunks cells into rows of 3 (+ header rows) so this stays
// a SINGLE virtualized FlatList — no numColumns fighting the header rows.
// Tapping a cell hands its row key back to the parent (flies to that card
// in the scroll deck — the parent owns the mode switch).

import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import type { TimelineMonth, TimelineUpcomingItem } from '../../lib/api/timeline';
import { durations, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BareScore } from '../ui/Stub';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore } from './format';
import { buildMapGrid, type MapCell, type MapGranularity, type MapRow } from './mapModel';

const COLUMNS = 3;
const GRID_GAP = 2;
// Cells past this global index mount without the tear-in stagger.
const STAGGER_CUTOFF = 12;

type TimelineMapViewProps = {
  /** Open on a specific sub-mode (deep links / screenshot pipeline). */
  initialMode?: MapGranularity | 'map';
  upcoming: TimelineUpcomingItem[];
  months: TimelineMonth[];
  /** True while the parent is backfilling older pages so the map is complete. */
  loadingAll: boolean;
  /** Marker keys are the scroll view's row keys — fly back to that row. */
  onPressMarker: (rowKey: string) => void;
};

function GroupHeader({ label }: { label: string }) {
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.header}>
      <Text style={styles.headerLabel}>{label}</Text>
    </View>
  );
}

function GridCell({
  cell,
  size,
  onPress,
}: {
  cell: MapCell;
  size: number;
  onPress: () => void;
}) {
  const styles = useThemedStyles(buildStyles);

  const body = (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={cell.label}
      style={[
        styles.cell,
        // Fixed square — one continuous Instagram grid; a partial final row
        // sits left-aligned like a real profile grid.
        { width: size, height: size },
        // Dashed frame only for a plan with NO art; everything else is a
        // full-bleed photo tile (Instagram mosaic).
        cell.kind === 'plan' && !cell.thumbnailUrl ? styles.cellPlan : styles.cellFill,
      ]}
    >
      {cell.kind === 'photo' ? (
        <>
          <Image
            source={{ uri: cell.thumbnailUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={cell.key}
          />
          {typeof cell.score === 'number' ? (
            <View style={styles.scoreScrim}>
              <BareScore score={cell.score} size={15} />
            </View>
          ) : null}
        </>
      ) : cell.kind === 'entry' ? (
        <>
          <Text style={styles.initial}>{cell.initial}</Text>
          {typeof cell.score === 'number' ? (
            <Text style={styles.entryScore}>{formatScore(cell.score)}</Text>
          ) : null}
        </>
      ) : (
        // Plan: event art behind a small countdown badge (or a bare
        // countdown when there's no art).
        <>
          {cell.thumbnailUrl ? (
            <Image
              source={{ uri: cell.thumbnailUrl }}
              style={styles.photo}
              contentFit="cover"
              transition={80}
              cachePolicy="memory-disk"
              recyclingKey={cell.key}
            />
          ) : null}
          <View style={cell.thumbnailUrl ? styles.countdownBadge : undefined}>
            <Text style={styles.countdown}>{cell.countdown}</Text>
          </View>
        </>
      )}
      {/* Tiny month/year tag — only on the first cell of a group. */}
      {cell.monthTag ? (
        <View style={styles.monthTag} pointerEvents="none">
          <Text style={styles.monthTagText}>{cell.monthTag}</Text>
        </View>
      ) : null}
    </SpringPressable>
  );

  if (cell.index >= STAGGER_CUTOFF) return body;
  return <Animated.View entering={tearIn(cell.index * durations.stagger)}>{body}</Animated.View>;
}

export function TimelineMapView({ upcoming, months, loadingAll, onPressMarker, initialMode }: TimelineMapViewProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { width } = useWindowDimensions();

  void initialMode;
  const rows = useMemo(
    () => buildMapGrid(upcoming, months, 'month'),
    [upcoming, months],
  );

  const cellSize = useMemo(() => {
    const usable = width - GRID_GAP * (COLUMNS - 1);
    return Math.floor(usable / COLUMNS);
  }, [width, tokens.density.pad]);

  const renderRow = useCallback(
    ({ item }: { item: MapRow }) => {
      if (item.type === 'header') return <GroupHeader label={item.label} />;
      return (
        <View style={styles.row}>
          {item.cells.map((cell) => (
            <GridCell key={cell.key} cell={cell} size={cellSize} onPress={() => onPressMarker(cell.key)} />
          ))}
        </View>
      );
    },
    [cellSize, onPressMarker, styles.row],
  );

  // Just the Instagram GRID now — the globe/map mode was removed.
  return (
    <View style={styles.list}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={18}
        ListFooterComponent={
          loadingAll ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    list: {
      flex: 1,
    },
    // Full-bleed like the Instagram grid — cells run edge to edge.
    content: {
      paddingTop: 6,
      paddingBottom: 48,
    },
    // Fixed above both bodies — the pills must not shift between modes.
    modeBar: {
      paddingHorizontal: tokens.density.pad,
      paddingTop: 16,
    },
    globe: {
      flex: 1,
      marginHorizontal: tokens.density.pad,
      marginBottom: 16,
    },
    // HARD month boundary: a 2px ink rule across the full width, month
    // label beneath it. Empty months never reach the model, so every
    // border marks real shows.
    header: {
      marginTop: 20,
      marginBottom: 8,
      borderTopWidth: 2,
      borderTopColor: tokens.colors.fg,
      paddingTop: 8,
      paddingHorizontal: tokens.density.pad,
    },
    headerLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: tokens.colors.fg,
    },
    row: {
      flexDirection: 'row',
      gap: GRID_GAP,
      marginBottom: GRID_GAP,
    },
    cell: {
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      // No per-cell border — Instagram delineates purely with the gutter
      // gap; a border on top read as a heavy double-line.
    },
    cellFill: {
      backgroundColor: tokens.colors.card2,
    },
    monthTag: {
      position: 'absolute',
      top: 5,
      left: 5,
      backgroundColor: 'rgba(11,11,16,0.72)',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    monthTagText: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: '#FFFFFF',
    },
    cellPlan: {
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: tokens.colors.dash,
    },
    photo: {
      ...StyleSheet.absoluteFillObject,
    },
    scoreScrim: {
      position: 'absolute',
      right: 3,
      bottom: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      // Over-photo scrim is deliberately literal (theme-independent), same
      // convention as MemoryCard's chip fill.
      backgroundColor: 'rgba(11,11,16,0.55)',
    },
    initial: {
      fontSize: 26,
      fontWeight: '800',
      color: tokens.colors.fg,
      letterSpacing: -0.5,
    },
    entryScore: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      color: tokens.colors.muteSoft,
      marginTop: 4,
    },
    countdownBadge: {
      position: 'absolute',
      right: 5,
      bottom: 5,
      backgroundColor: 'rgba(11,11,16,0.72)',
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    countdown: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: tokens.colors.fg,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 12,
    },
    modeChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      backgroundColor: tokens.colors.card,
    },
    modeChipActive: {
      backgroundColor: tokens.colors.inverseBg,
      borderColor: tokens.colors.inverseBg,
    },
    modeText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      color: tokens.colors.mute,
    },
    modeTextActive: { color: tokens.colors.inverseFg },
    loadingFooter: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
  });
