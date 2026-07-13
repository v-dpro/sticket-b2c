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

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import type { TimelineMonth, TimelineUpcomingItem } from '../../lib/api/timeline';
import { durations, haptics, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BareScore } from '../ui/Stub';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore } from './format';
import { buildMapGrid, type MapCell, type MapGranularity, type MapRow } from './mapModel';
import { useRouter } from 'expo-router';
import { useSession } from '../../hooks/useSession';
import { ProfileMapView } from '../profile/MapView';

const COLUMNS = 3;
const GRID_GAP = 3;
// Cells past this global index mount without the tear-in stagger.
const STAGGER_CUTOFF = 12;

type TimelineMapViewProps = {
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
      <View style={styles.headerRule} />
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
        { width: size, height: size },
        cell.kind === 'plan' ? styles.cellPlan : styles.cellFill,
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
        <Text style={styles.countdown}>{cell.countdown}</Text>
      )}
    </SpringPressable>
  );

  if (cell.index >= STAGGER_CUTOFF) return body;
  return <Animated.View entering={tearIn(cell.index * durations.stagger)}>{body}</Animated.View>;
}

export function TimelineMapView({ upcoming, months, loadingAll, onPressMarker }: TimelineMapViewProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { width } = useWindowDimensions();

  // Overview granularity: week / month / year grids, or the real MAP.
  const [mode, setMode] = useState<MapGranularity | 'map'>('month');
  const router = useRouter();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const openVenue = useCallback((venueId: string) => router.push(`/venue/${venueId}`), [router]);

  const rows = useMemo(
    () => buildMapGrid(upcoming, months, mode === 'map' ? 'month' : mode),
    [upcoming, months, mode],
  );

  const cellSize = useMemo(() => {
    const usable = width - tokens.density.pad * 2 - GRID_GAP * (COLUMNS - 1);
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

  const MODES: { key: MapGranularity | 'map'; label: string }[] = [
    { key: 'week', label: 'WEEK' },
    { key: 'month', label: 'MONTH' },
    { key: 'year', label: 'YEAR' },
    { key: 'map', label: 'MAP' },
  ];

  const modeChips = (
    <View style={styles.modeRow}>
      {MODES.map((m) => {
        const active = m.key === mode;
        return (
          <SpringPressable
            key={m.key}
            haptic="none"
            onPress={() => {
              if (m.key !== mode) {
                haptics.light();
                setMode(m.key);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m.label}
            style={[styles.modeChip, active ? styles.modeChipActive : null]}
          >
            <Text style={[styles.modeText, active ? styles.modeTextActive : null]}>{m.label}</Text>
          </SpringPressable>
        );
      })}
    </View>
  );

  if (mode === 'map') {
    // The real map — venues pinned where they are (the collection as
    // geography); cells and headers give way to the globe.
    return (
      <View style={styles.list}>
        {modeChips}
        {userId ? <ProfileMapView userId={userId} onVenuePress={openVenue} /> : null}
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderRow}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={18}
      ListHeaderComponent={modeChips}
      ListFooterComponent={
        loadingAll ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={tokens.colors.mute} />
          </View>
        ) : null
      }
    />
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    list: {
      flex: 1,
    },
    content: {
      paddingHorizontal: tokens.density.pad,
      paddingTop: 16,
      paddingBottom: 48,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      marginBottom: 10,
    },
    headerLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
    },
    headerRule: {
      flex: 1,
      height: 1,
      backgroundColor: tokens.colors.hairline,
    },
    row: {
      flexDirection: 'row',
      gap: GRID_GAP,
      marginBottom: GRID_GAP,
    },
    cell: {
      borderRadius: 4,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellFill: {
      backgroundColor: tokens.colors.card2,
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
