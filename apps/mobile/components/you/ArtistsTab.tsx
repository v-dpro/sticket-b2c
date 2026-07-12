// You · ARTISTS — the artists you track, as collectibles: seen-counts,
// next dates, presale flags. Rows tap through to the artist page.

import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useMyArtists } from '../../hooks/useMyArtists';
import { durations, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

type ArtistRow = {
  artist: { id: string; name: string; imageUrl?: string | null };
  tier?: string;
  stats?: { timesSeen?: number };
  upcomingShows?: { id: string; date?: string }[];
  upcomingPresales?: unknown[];
};

function nextShowLabel(row: ArtistRow): string | null {
  const next = row.upcomingShows?.[0];
  if (!next?.date) return null;
  const d = new Date(next.date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export function ArtistsTab() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { data, loading } = useMyArtists();

  const styles = useThemedStyles((t) => ({
    center: { paddingVertical: 60, alignItems: 'center' },
    section: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 18,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.card2 },
    body: { flex: 1, minWidth: 0, gap: 3 },
    name: { fontSize: 16, fontWeight: '700', color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    // The collectible count — a small flat stamp.
    countStamp: {
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.chip,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    countText: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.fg,
    },
    empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    emptySub: { fontSize: 13.5, color: t.colors.mute, textAlign: 'center' },
  }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.colors.mute} />
      </View>
    );
  }

  const sections: { label: string; rows: ArtistRow[] }[] = [
    { label: 'Top tier', rows: (data?.topTier ?? []) as ArtistRow[] },
    { label: 'Following', rows: (data?.following ?? []) as ArtistRow[] },
    { label: 'Casual', rows: (data?.casual ?? []) as ArtistRow[] },
  ].filter((s) => s.rows.length > 0);

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No artists tracked yet</Text>
        <Text style={styles.emptySub}>Follow artists to build your radar — presales and shows land here.</Text>
        <PillButton title="Explore artists" springFeedback haptic="light" onPress={() => router.push('/(tabs)/explore')} />
      </View>
    );
  }

  let i = 0;
  return (
    <View>
      {sections.map((section) => (
        <View key={section.label}>
          <Text style={styles.section}>{section.label}</Text>
          {section.rows.map((row) => {
            const seen = row.stats?.timesSeen ?? 0;
            const next = nextShowLabel(row);
            const hasPresale = (row.upcomingPresales?.length ?? 0) > 0;
            const idx = i++;
            return (
              <Animated.View key={row.artist.id} entering={tearIn(Math.min(idx, 8) * durations.stagger)}>
                <SpringPressable
                  haptic="light"
                  onPress={() => router.push(`/artist/${row.artist.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.artist.name}, seen ${seen} times`}
                  style={styles.row}
                >
                  {row.artist.imageUrl ? (
                    <Image source={{ uri: row.artist.imageUrl }} style={styles.avatar} contentFit="cover" transition={80} cachePolicy="memory-disk" />
                  ) : (
                    <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="musical-notes-outline" size={18} color={tokens.colors.mute} />
                    </View>
                  )}
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.artist.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[next ? `NEXT ${next}` : null, hasPresale ? 'PRESALE SOON' : null]
                        .filter(Boolean)
                        .join(' · ') || 'NO DATES YET'}
                    </Text>
                  </View>
                  {seen > 0 ? (
                    <View style={styles.countStamp}>
                      <Text style={styles.countText}>×{seen}</Text>
                    </View>
                  ) : null}
                </SpringPressable>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
