// You · ARTISTS — the artists you track, as collectibles: seen-counts,
// next dates, presale flags. Rows tap through to the artist page. Below
// the artist sections, a TROPHIES section folds in the collection extras
// (firsts, streak, years, most-seen leaderboard) — COLLECTION subtab absorbed.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useMyArtists } from '../../hooks/useMyArtists';
import { getMyCollection, type CollectionTrophies, type MyCollection } from '../../lib/api/collection';
import { durations, tearIn } from '../../lib/motion';
import { artistTier } from '../../lib/gamification';
import { ScoutCard } from './ScoutCard';
import { TierStamp } from './TierStamp';
import { TourSetsSection } from './TourSetsSection';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

type ArtistRow = {
  artist: { id: string; name: string; imageUrl?: string | null };
  tier?: string;
  stats?: { timesSeen?: number };
  upcomingShows?: { id: string; date?: string }[];
  upcomingPresales?: unknown[];
  /** The one-liner: the artist's most-timely drop (show/presale/tour). */
  latestDrop?: {
    kind: 'show' | 'presale' | 'tour';
    text: string;
    date: string;
    eventId?: string;
    presaleId?: string;
    planned: boolean;
  } | null;
  friendsTracking?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    degree?: 1 | 2;
  }[];
  friendsSeenMore?: { count: number };
};

function nextShowLabel(row: ArtistRow): string | null {
  const next = row.upcomingShows?.[0];
  if (!next?.date) return null;
  const d = new Date(next.date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function monYear(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
}

export function ArtistsTab() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { data, loading } = useMyArtists();

  // TROPHIES — a separate, non-blocking fetch; the section renders
  // nothing until `trophies` lands on the payload (backend in parallel).
  const [trophies, setTrophies] = useState<CollectionTrophies | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getMyCollection()
      .then((c: MyCollection) => {
        if (alive) setTrophies(c.trophies);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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
    name: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
    // Right-aligned plan state on the DROPS line — success green when
    // ticketed/marked, muteSoft otherwise (§4 You / C20).
    plannedText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.success,
    },
    notPlannedText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    // The collectible seen-count — a small flat stamp. Never-seen = a
    // dashed "×0" stamp (spec).
    countStamp: {
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.chip,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    countStampEmpty: { borderColor: t.colors.dash, borderStyle: 'dashed' },
    countText: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.fg,
    },
    countTextEmpty: { color: t.colors.mute },
    empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    emptySub: { fontSize: 13.5, color: t.colors.mute, textAlign: 'center' },

    // ── TROPHIES (COLLECTION absorbed) ──────────────────────────────
    streakStamp: {
      alignSelf: 'flex-start',
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.chip,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    streakText: {
      fontFamily: t.fontFamilies.monoBold,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.fg,
    },
    firstsCard: {
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card2,
      gap: 3,
    },
    firstsText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    firstsSub: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    yearsStrip: {
      marginHorizontal: t.density.pad,
      marginBottom: 14,
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    leaderRight: { alignItems: 'flex-end', gap: 5 },
    youStamp: {
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.chip,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    youStampText: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      color: t.colors.fg,
    },
    friendLeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    friendLeadText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
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

  const hasTrophyContent =
    !!trophies &&
    (trophies.streak.months > 0 ||
      !!trophies.firsts.firstShow ||
      trophies.firsts.venuesCount > 0 ||
      trophies.firsts.citiesCount > 0 ||
      trophies.years.length > 0 ||
      trophies.mostSeenLeaderboard.length > 0);

  if (sections.length === 0 && !hasTrophyContent) {
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
            const dropText =
              row.latestDrop?.text ||
              [next ? `NEXT ${next}` : null, hasPresale ? 'PRESALE SOON' : null]
                .filter(Boolean)
                .join(' · ');
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
                    {/* DROPS line — what this artist is doing next + plan state. */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.meta, { flexShrink: 1 }]} numberOfLines={1}>
                        {dropText ? `DROPS · ${dropText}` : 'NO DATES YET'}
                      </Text>
                      <View style={{ flex: 1 }} />
                      {row.latestDrop ? (
                        <Text style={row.latestDrop.planned ? styles.plannedText : styles.notPlannedText}>
                          {row.latestDrop.planned ? 'PLANNED ✓' : 'NOT PLANNED'}
                        </Text>
                      ) : null}
                    </View>
                    {(row.friendsTracking?.length ?? 0) > 0 || (row.friendsSeenMore?.count ?? 0) > 0 ? (
                      <View style={styles.socialRow}>
                        {(row.friendsTracking?.length ?? 0) > 0 ? (
                          <DegreeFacepile
                            people={row.friendsTracking!}
                            size={20}
                            max={3}
                            surfaceColor={tokens.colors.card}
                          />
                        ) : null}
                        <Text style={styles.meta} numberOfLines={1}>
                          {[
                            (row.friendsTracking?.length ?? 0) > 0
                              ? `${row.friendsTracking!.length} FRIEND${row.friendsTracking!.length === 1 ? '' : 'S'} TRACK`
                              : null,
                            (row.friendsSeenMore?.count ?? 0) > 0
                              ? `${row.friendsSeenMore!.count} AHEAD OF YOU`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <TierStamp tier={artistTier(seen)} />
                  {/* Always a stamp — dashed "×0" when never seen (spec). */}
                  <View style={[styles.countStamp, seen === 0 && styles.countStampEmpty]}>
                    <Text style={[styles.countText, seen === 0 && styles.countTextEmpty]}>×{seen}</Text>
                  </View>
                </SpringPressable>
              </Animated.View>
            );
          })}
        </View>
      ))}

      {/* TROPHIES — COLLECTION's extras (firsts, streak, years, leaderboard).
          Venues/cities counts live in MAP; no list is duplicated here. */}
      {hasTrophyContent && trophies ? (
        <View>
          <Text style={styles.section}>Trophies</Text>

          {trophies.streak.months > 0 ? (
            <View style={styles.streakStamp}>
              <Text style={styles.streakText}>{trophies.streak.months}-MONTH STREAK</Text>
            </View>
          ) : null}

          {trophies.firsts.firstShow || trophies.firsts.venuesCount > 0 || trophies.firsts.citiesCount > 0 ? (
            <View style={styles.firstsCard}>
              {trophies.firsts.firstShow ? (
                <Text style={styles.firstsText} numberOfLines={1}>
                  {['FIRST SHOW', trophies.firsts.firstShow.artistName, monYear(trophies.firsts.firstShow.date)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
              {trophies.firsts.venuesCount > 0 || trophies.firsts.citiesCount > 0 ? (
                <Text style={styles.firstsSub} numberOfLines={1}>
                  {trophies.firsts.venuesCount} VENUES · {trophies.firsts.citiesCount} CITIES
                </Text>
              ) : null}
            </View>
          ) : null}

          {trophies.years.length > 0 ? (
            <Text style={styles.yearsStrip} numberOfLines={1}>
              {trophies.years.map((y) => `${y.year} · ${y.shows}`).join('   ')}
            </Text>
          ) : null}

          {trophies.mostSeenLeaderboard.map((row, idx) => {
            const friendCount = row.friendsTracking?.length ?? 0;
            return (
              <Animated.View key={row.artist.id} entering={tearIn(Math.min(idx, 8) * durations.stagger)}>
                <SpringPressable
                  haptic="light"
                  onPress={() => router.push(`/artist/${row.artist.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.artist.name}, you have seen ${row.you} times`}
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
                    {friendCount > 0 ? (
                      <View style={styles.socialRow}>
                        <DegreeFacepile people={row.friendsTracking!} size={16} max={3} surfaceColor={tokens.colors.card} />
                        <Text style={styles.meta} numberOfLines={1}>
                          {friendCount} FRIEND{friendCount === 1 ? '' : 'S'} TRACK
                          {typeof row.topFriendCount === 'number' ? ` · TOP ×${row.topFriendCount}` : ''}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.leaderRight}>
                    <View style={styles.youStamp}>
                      <Text style={styles.youStampText}>YOU ×{row.you}</Text>
                    </View>
                    {row.topFriend ? (
                      <View style={styles.friendLeadRow}>
                        <DegreeFacepile people={[row.topFriend.person]} size={18} max={1} surfaceColor={tokens.colors.card} />
                        <Text style={styles.friendLeadText} numberOfLines={1}>
                          @{row.topFriend.person.username} ×{row.topFriend.count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </SpringPressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      {/* TOUR STUBS — completion sets: dates collected per tour. */}
      <TourSetsSection />

      {/* SCOUT — the contribution ladder (tips / seat views / answers). */}
      <ScoutCard />
    </View>
  );
}
