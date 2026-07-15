// TourSetsSection — TOUR STUBS on the You page: the completion-set layer of
// the collection. Every tour you've logged is a stub (C3: solid border +
// perforation — the night happened); the foot carries the set math
// ("3/24 DATES") and the earned stamp: FOLLOWED at 2+ dates, COMPLETE when
// the whole tour is collected. Sets are what make collectors compulsive —
// one date in, the second is a chase. Tap → /tour/[tourId]. Self-fetching;
// renders nothing until a tour exists in the collection.

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { getMySets, type TourSet } from '../../lib/api/sets';
import { durations, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { StubPerforation } from '../ui/Stub';

export function TourSetsSection() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [sets, setSets] = useState<TourSet[]>([]);

  useEffect(() => {
    let alive = true;
    getMySets()
      .then((s) => {
        if (alive) setSets(s);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const styles = useThemedStyles((t) => ({
    section: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 24,
      marginBottom: 10,
    },
    stub: {
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.colors.line,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    image: { width: 44, height: 44, borderRadius: t.radius.sm, backgroundColor: t.colors.card2 },
    imageFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0, gap: 3 },
    name: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    foot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    footMono: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    // The earned stamp — outlined at FOLLOWED, inverted at COMPLETE.
    stamp: {
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    stampFilled: { backgroundColor: t.colors.inverseBg, borderColor: t.colors.inverseBg },
    stampText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 1,
      color: t.colors.fg,
    },
    stampTextFilled: { color: t.colors.inverseFg },
  }));

  if (sets.length === 0) return null;

  return (
    <View>
      <Text style={styles.section}>Tour stubs</Text>
      {sets.slice(0, 8).map((set, i) => (
        <Animated.View key={set.id} entering={tearIn(Math.min(i, 8) * durations.stagger)}>
          <SpringPressable
            haptic="light"
            onPress={() => router.push(`/tour/${set.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${set.name} — ${set.collected} of ${set.totalDates} dates collected`}
            style={styles.stub}
          >
            <View style={styles.row}>
              {set.imageUrl ? (
                <Image
                  source={{ uri: set.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  transition={80}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.image, styles.imageFallback]}>
                  <Ionicons name="bookmark-outline" size={18} color={tokens.colors.mute} />
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {set.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {set.artistName}
                </Text>
              </View>
            </View>
            <StubPerforation notchColor={tokens.colors.bg} dashColor={tokens.colors.dash} />
            <View style={styles.foot}>
              <Text style={styles.footMono}>
                {set.collected}/{Math.max(set.totalDates, set.collected)} DATES
              </Text>
              {set.complete ? (
                <View style={[styles.stamp, styles.stampFilled]}>
                  <Text style={[styles.stampText, styles.stampTextFilled]}>COMPLETE</Text>
                </View>
              ) : set.followed ? (
                <View style={styles.stamp}>
                  <Text style={styles.stampText}>FOLLOWED</Text>
                </View>
              ) : (
                <Text style={styles.footMono}>ONE MORE = FOLLOWED</Text>
              )}
            </View>
          </SpringPressable>
        </Animated.View>
      ))}
    </View>
  );
}
