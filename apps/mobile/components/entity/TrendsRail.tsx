// TrendsRail (C23) — crowd-tagged trends for an event or a tour. Self-
// fetching: pass either `eventId` or `tourId` and it loads its own data,
// rendering nothing until it has at least one trend. The backend for
// GET /events/:id/trends · GET /tours/:id/trends is landing in parallel —
// lib/api/trends.ts never throws, so "no data yet" and "route doesn't
// exist yet" both look the same here: the section quietly doesn't appear.
//
// Each trend is a chip ("#tag" + "× count") over a horizontal strip of
// photo tiles; tapping a tile opens that memory. No hue, no icon — the
// count is the whole signal.

import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { getEventTrends, getTourTrends, type Trend } from '../../lib/api/trends';
import { durations, tearIn } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { SectionLabel } from './EntityBits';

type TrendsRailProps = { eventId: string; tourId?: undefined } | { tourId: string; eventId?: undefined };

const PHOTO_SIZE = 72;

export function TrendsRail(props: TrendsRailProps) {
  const router = useRouter();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [ready, setReady] = useState(false);
  const id = props.eventId ?? props.tourId ?? '';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setReady(false);
    (async () => {
      const res = props.eventId ? await getEventTrends(props.eventId) : await getTourTrends(props.tourId!);
      if (cancelled) return;
      setTrends(res.trends);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id is the stable key; props identity churns per render
  }, [id]);

  const styles = useThemedStyles((t) => ({
    section: { marginTop: 28 },
    block: { marginTop: 14 },
    chipRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    tag: {
      fontFamily: t.fontFamilies.monoBold,
      fontSize: 12,
      letterSpacing: 0.3,
      color: t.colors.fg,
    },
    count: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.muteSoft,
    },
    strip: { marginTop: 10, gap: 6 },
    stripContent: { gap: 6 },
    photo: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
  }));

  if (!ready || trends.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionLabel>Trending</SectionLabel>
      {trends.map((trend, i) => (
        <Animated.View
          key={trend.tag}
          entering={tearIn(Math.min(i, 8) * durations.stagger)}
          style={i === 0 ? undefined : styles.block}
        >
          <View style={styles.chipRow}>
            <Text style={styles.tag}>#{trend.tag}</Text>
            <Text style={styles.count}>× {trend.count}</Text>
          </View>
          {trend.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.strip}
              contentContainerStyle={styles.stripContent}
            >
              {trend.photos.map((photo) => (
                <SpringPressable
                  key={photo.logId}
                  haptic="light"
                  onPress={() => router.push({ pathname: '/memory/[logId]', params: { logId: photo.logId } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open memory tagged #${trend.tag}`}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photo}
                    contentFit="cover"
                    transition={80}
                    cachePolicy="memory-disk"
                    recyclingKey={photo.logId}
                  />
                </SpringPressable>
              ))}
            </ScrollView>
          ) : null}
        </Animated.View>
      ))}
    </View>
  );
}
