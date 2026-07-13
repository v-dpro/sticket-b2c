// TrendsRail (C23) — fan-made hashtags for an event or a tour. Self-
// fetching: pass either `eventId` or `tourId` and it loads its own data,
// rendering nothing until it has at least one trend. The backend for
// GET /events/:id/trends · GET /tours/:id/trends is landing in parallel —
// lib/api/trends.ts never throws, so "no data yet" and "route doesn't
// exist yet" both look the same here: the section quietly doesn't appear.
//
// The row is a CHIP SELECTOR (C23): the active trend wears an fg border and
// reads "#TAG count" in mono; the others sit on a line border, muted; a
// dashed "+ TAG YOURS" chip closes the row. A trend that has crossed ~50
// posts is PROMOTED — it earns a HIGHLIGHTS rail of 110×140 photo tiles
// (author + ♥ count on the scrim, a +N overflow tile), titled
// "HIGHLIGHTS · #TAG" with an "ALL N →" link. Ink only — the count is the
// whole flex, no hue, no emoji.

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { getEventTrends, getTourTrends, type Trend } from '../../lib/api/trends';
import { durations, haptics, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type TrendsRailProps = { eventId: string; tourId?: undefined } | { tourId: string; eventId?: undefined };

// A trend crossing ~50 posts earns the HIGHLIGHTS rail (C23).
const HIGHLIGHT_THRESHOLD = 50;
const MAX_TILES = 6;
const TILE_W = 110;
const TILE_H = 140;

// Over-photo scrim — theme-independent (media stays dark-scrimmed, C1).
const SCRIM_COLORS = ['rgba(11,11,16,0)', 'rgba(11,11,16,0.85)'] as const;
const SCRIM_LOCATIONS = [0.45, 1] as const;

export function TrendsRail(props: TrendsRailProps) {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [ready, setReady] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const id = props.eventId ?? props.tourId ?? '';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      const res = props.eventId ? await getEventTrends(props.eventId) : await getTourTrends(props.tourId!);
      if (cancelled) return;
      setTrends(res.trends);
      setActiveIdx(0);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id is the stable key; props identity churns per render
  }, [id]);

  if (!ready || trends.length === 0) return null;

  const active = trends[activeIdx] ?? trends[0]!;
  const promoted = active.count >= HIGHLIGHT_THRESHOLD && active.photos.length > 0;
  const shown = active.photos.slice(0, MAX_TILES);
  const overflow = Math.max(0, active.count - shown.length);

  return (
    <View style={styles.section}>
      {/* Chip row — the trend selector. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {trends.map((trend, i) => {
          const isActive = i === activeIdx;
          return (
            <SpringPressable
              key={trend.tag}
              haptic="light"
              onPress={() => setActiveIdx(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`#${trend.tag}, ${trend.count} posts`}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipIdle]}
            >
              <Text style={[styles.chipTag, isActive ? styles.chipTagActive : styles.chipTagIdle]}>
                #{trend.tag.toUpperCase()}
              </Text>
              <Text style={[styles.chipCount, isActive ? styles.chipCountActive : styles.chipCountIdle]}>
                {trend.count}
              </Text>
            </SpringPressable>
          );
        })}
        {/* "+ TAG YOURS" — the tagging flow lands with the trends backend. */}
        <SpringPressable
          haptic="light"
          onPress={() => haptics.light()}
          accessibilityRole="button"
          accessibilityLabel="Tag your memory with a trend"
          style={[styles.chip, styles.chipDashed]}
        >
          <Text style={styles.chipTagYours}>+ TAG YOURS</Text>
        </SpringPressable>
      </ScrollView>

      {/* HIGHLIGHTS rail — earned once a tag crosses ~50 posts. */}
      {promoted ? (
        <Animated.View entering={tearIn(0)} style={styles.highlights}>
          <View style={styles.highlightsHead}>
            <Text style={styles.highlightsTitle} numberOfLines={1}>
              HIGHLIGHTS · #{active.tag.toUpperCase()}
            </Text>
            <SpringPressable
              haptic="light"
              onPress={() => haptics.light()}
              accessibilityRole="button"
              accessibilityLabel={`See all ${active.count} #${active.tag} posts`}
            >
              <Text style={styles.allLink}>ALL {active.count} →</Text>
            </SpringPressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tilesRow}
          >
            {shown.map((photo, i) => (
              <Animated.View key={photo.logId} entering={tearIn(Math.min(i, 8) * durations.stagger)}>
                <SpringPressable
                  haptic="light"
                  onPress={() =>
                    router.push({ pathname: '/memory/[logId]', params: { logId: photo.logId } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open memory tagged #${active.tag}`}
                  style={styles.tile}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.tilePhoto}
                    contentFit="cover"
                    transition={80}
                    cachePolicy="memory-disk"
                    recyclingKey={photo.logId}
                  />
                  {photo.author || typeof photo.likeCount === 'number' ? (
                    <>
                      <LinearGradient
                        colors={SCRIM_COLORS}
                        locations={SCRIM_LOCATIONS}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.tileScrim}
                        pointerEvents="none"
                      />
                      <View style={styles.tileMeta} pointerEvents="none">
                        {photo.author ? (
                          <Text style={styles.tileAuthor} numberOfLines={1}>
                            @{photo.author}
                          </Text>
                        ) : (
                          <View style={{ flex: 1 }} />
                        )}
                        {typeof photo.likeCount === 'number' ? (
                          <View style={styles.tileLike}>
                            <Ionicons name="heart" size={10} color="#FFFFFF" />
                            <Text style={styles.tileLikeCount}>{photo.likeCount}</Text>
                          </View>
                        ) : null}
                      </View>
                    </>
                  ) : null}
                </SpringPressable>
              </Animated.View>
            ))}
            {overflow > 0 ? (
              <SpringPressable
                haptic="light"
                onPress={() => haptics.light()}
                accessibilityRole="button"
                accessibilityLabel={`${overflow} more #${active.tag} posts`}
                style={[styles.tile, styles.overflowTile]}
              >
                <Text style={styles.overflowText}>+{overflow}</Text>
              </SpringPressable>
            ) : null}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    section: { marginTop: 28 },

    // ── Chip row ──
    chipRow: { gap: 8, alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: tokens.radius.chip,
      borderWidth: 1,
    },
    chipActive: { borderColor: tokens.colors.fg },
    chipIdle: { borderColor: tokens.colors.line },
    chipDashed: { borderColor: tokens.colors.dash, borderStyle: 'dashed' },
    chipTag: {
      fontSize: 11.5,
      letterSpacing: 0.3,
    },
    chipTagActive: { fontFamily: tokens.fontFamilies.monoBold, color: tokens.colors.fg },
    chipTagIdle: { fontFamily: tokens.fontFamilies.mono, color: tokens.colors.mute },
    chipCount: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
    },
    chipCountActive: { color: tokens.colors.fg },
    chipCountIdle: { color: tokens.colors.muteSoft },
    chipTagYours: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
    },

    // ── HIGHLIGHTS rail ──
    highlights: { marginTop: 18 },
    highlightsHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    highlightsTitle: {
      flex: 1,
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    allLink: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
    },
    tilesRow: { gap: 8 },
    tile: {
      width: TILE_W,
      height: TILE_H,
      borderRadius: tokens.radius.md,
      overflow: 'hidden',
      backgroundColor: tokens.colors.card2,
    },
    tilePhoto: { width: '100%', height: '100%' },
    tileScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
    tileMeta: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tileAuthor: {
      flex: 1,
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
    tileLike: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    tileLikeCount: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 9.5,
      color: '#FFFFFF',
    },
    overflowTile: { alignItems: 'center', justifyContent: 'center' },
    overflowText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 16,
      color: tokens.colors.mute,
    },
  });
