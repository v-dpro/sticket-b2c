// Artist entity page — hero, follow, YOU × ARTIST history card,
// ON TOUR (Bandsintown-backed upcoming dates), ALL TOURS (→ /tour/[id]).
//
// APIs: GET /artists/:id · POST/DELETE /artists/:id/follow ·
// GET /artists/:id/my-history · GET /artists/:id/events/bandsintown
// (fallback GET /artists/:id/events?upcoming=true) · GET /artists/:id/tours.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EntityNav } from '../../components/entity/EntityChrome';
import {
  MonoChip,
  QuietEmpty,
  SectionLabel,
  StatBlock,
} from '../../components/entity/EntityBits';
import {
  EntityError,
  EntityPageSkeleton,
  RowSkeletons,
  ShimmerBlock,
} from '../../components/entity/EntityStates';
import { formatScore, monoDate, yearOf } from '../../components/entity/format';
import { DegreeFacepile } from '../../components/ui/DegreeFacepile';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { ScoreStamp } from '../../components/ui/Stub';

import { useArtist } from '../../hooks/useArtist';
import {
  followArtist,
  getArtistMyHistory,
  getArtistShows,
  getArtistTours,
  unfollowArtist,
  type ArtistHistoryEntry,
  type ArtistTour,
} from '../../lib/api/artists';
import { getArtistEventsBandsintown } from '../../lib/api/logShow';
import { getArtistWhoSaw, type WhoSawResponse } from '../../lib/api/whoSaw';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

type UpcomingRow = {
  id: string;
  title: string;
  meta: string;
  date: string;
};

type AsyncStatus = 'loading' | 'ready' | 'error';

export default function ArtistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { width } = useWindowDimensions();
  const { tokens } = useTheme();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const id = artistId ? String(artistId) : '';

  const { artist, loading, error, refetch, updateFollowing } = useArtist(id);

  // Secondary data — each degrades independently.
  const [history, setHistory] = useState<ArtistHistoryEntry[]>([]);
  const [historyStatus, setHistoryStatus] = useState<AsyncStatus>('loading');
  const [tours, setTours] = useState<ArtistTour[]>([]);
  const [toursStatus, setToursStatus] = useState<AsyncStatus>('loading');
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [upcomingStatus, setUpcomingStatus] = useState<AsyncStatus>('loading');
  const [whoSaw, setWhoSaw] = useState<WhoSawResponse | null>(null);
  const [whoSawStatus, setWhoSawStatus] = useState<AsyncStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const loadExtras = useCallback(async () => {
    if (!id) return;

    const [historyRes, toursRes, bitRes, whoSawRes] = await Promise.allSettled([
      getArtistMyHistory(id),
      getArtistTours(id),
      getArtistEventsBandsintown(id, false),
      getArtistWhoSaw(id),
    ]);

    setHistory(historyRes.status === 'fulfilled' ? historyRes.value : []);
    setHistoryStatus(historyRes.status === 'fulfilled' ? 'ready' : 'error');

    setTours(toursRes.status === 'fulfilled' ? toursRes.value : []);
    setToursStatus(toursRes.status === 'fulfilled' ? 'ready' : 'error');

    setWhoSaw(whoSawRes.status === 'fulfilled' ? whoSawRes.value : null);
    setWhoSawStatus(whoSawRes.status === 'fulfilled' ? 'ready' : 'error');

    // ON TOUR: Bandsintown first; fall back to DB upcoming events when empty.
    let rows: UpcomingRow[] = [];
    if (bitRes.status === 'fulfilled' && bitRes.value.length > 0) {
      rows = bitRes.value.map((e) => ({
        id: e.id,
        title: e.venue?.name ?? e.name,
        meta: [e.venue?.city, e.venue?.state].filter(Boolean).join(', '),
        date: e.date,
      }));
    } else {
      try {
        const dbShows = await getArtistShows(id, { upcoming: true, limit: 10 });
        rows = dbShows.map((s) => ({
          id: s.id,
          title: s.venue?.name ?? s.name,
          meta: [s.venue?.city, s.venue?.state].filter(Boolean).join(', '),
          date: s.date,
        }));
      } catch {
        // both sources failed — treated as no dates
      }
    }
    setUpcoming(rows);
    setUpcomingStatus('ready');
  }, [id]);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), loadExtras()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    if (!artist) return;
    try {
      await Share.share({
        title: artist.name,
        message: `Check out ${artist.name} on Sticket — https://sticket.in/artist/${id}`,
        url: `https://sticket.in/artist/${id}`,
      });
    } catch {
      // user dismissed the sheet — nothing to do
    }
  };

  const isFollowing = artist?.isFollowing ?? false;

  const handleFollow = async () => {
    if (!artist || followBusy) return;
    const next = !isFollowing;
    setFollowBusy(true);
    updateFollowing(next); // optimistic
    try {
      if (next) await followArtist(id);
      else await unfollowArtist(id);
      haptics.medium();
    } catch {
      updateFollowing(!next); // rollback
      haptics.error();
    } finally {
      setFollowBusy(false);
    }
  };

  // YOU × ARTIST stats — my-history first, artist-detail fields as fallback.
  const youStats = useMemo(() => {
    if (historyStatus === 'ready' && history.length > 0) {
      const ratings = history
        .map((h) => h.rating)
        .filter((r): r is number => typeof r === 'number');
      // Numeric avg kept for the ScoreStamp (the user's own score body).
      const avgNum = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;
      const years = history
        .map((h) => new Date(h.event?.date ?? '').getFullYear())
        .filter((y) => Number.isFinite(y));
      const firstYear = years.length ? String(Math.min(...years)) : '—';
      return { shows: String(history.length), avgNum, firstYear };
    }
    // Degraded: my-history unavailable (e.g. signed out / request failed).
    if (artist && artist.userShowCount > 0) {
      return {
        shows: String(artist.userShowCount),
        avgNum: null,
        firstYear: artist.userFirstShow ? yearOf(artist.userFirstShow.date) || '—' : '—',
      };
    }
    return null;
  }, [artist, history, historyStatus]);

  // WHO'S SEEN THEM caption — "4 FRIENDS · 12 IN YOUR ORBIT · 47 TOTAL".
  // Friends/orbit counted from the (≤12) returned sample; total from the
  // server's full connected count.
  const whoSawCaption = useMemo(() => {
    if (!whoSaw) return '';
    const friends = whoSaw.people.filter((p) => p.degree === 1).length;
    const orbit = whoSaw.people.filter((p) => p.degree === 2).length;
    return [
      friends > 0 ? `${friends} FRIEND${friends === 1 ? '' : 'S'}` : null,
      orbit > 0 ? `${orbit} IN YOUR ORBIT` : null,
      `${whoSaw.totalCount} TOTAL`,
    ]
      .filter(Boolean)
      .join(' · ');
  }, [whoSaw]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    heroFallback: { backgroundColor: t.colors.card2, width: '100%' },
    // Name embedded on the hero media (photo overlay = white ink, C §1.1).
    heroTextWrap: {
      position: 'absolute',
      left: t.density.pad,
      right: t.density.pad,
      bottom: 16,
    },
    heroName: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 12,
    },
    heroGenres: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 4,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    nameBlock: {
      paddingHorizontal: t.density.pad,
      paddingTop: 18,
    },
    name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    genres: { fontSize: 13, color: t.colors.mute, marginTop: 4 },
    // Tracking / Share row (+ followers count trailing).
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: t.density.pad,
      paddingTop: 14,
    },
    followers: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
      marginLeft: 'auto',
      textTransform: 'uppercase',
    },
    section: { paddingHorizontal: t.density.pad, marginTop: 28 },
    youCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      gap: 14,
    },
    youLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    youStatsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    youScoreBlock: { flex: 1, gap: 6, alignItems: 'flex-start' },
    youScoreLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    row: {
      minHeight: t.density.rowH,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: t.colors.text },
    rowTitleStrong: { fontSize: 15, fontWeight: '700', color: t.colors.text },
    rowMeta: { fontSize: 13, color: t.colors.mute },
    moreDates: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
      marginTop: 6,
      textTransform: 'uppercase',
    },
    whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    whoCaption: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.6,
      color: t.colors.mute,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
  }));

  // ── Loading / error shells ──
  if (loading && !artist) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <EntityNav onBack={goBack} floating />
        <View style={{ paddingTop: insets.top }}>
          <EntityPageSkeleton />
        </View>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <EntityError
          title="Couldn't load this artist"
          message={error}
          onRetry={() => void refetch()}
          onBack={goBack}
        />
      </View>
    );
  }

  const heroHeight = artist.imageUrl ? Math.round((width * 9) / 16) : insets.top + 96;
  const heroImage = artist.bannerUrl || artist.imageUrl;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
      >
        {/* ── Hero — artist name embedded 30/800 on the media ── */}
        <View style={{ height: heroHeight }}>
          {heroImage ? (
            <>
              <Image
                source={{ uri: heroImage }}
                style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: heroHeight }}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', tokens.colors.bg]}
                locations={[0.45, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroName} numberOfLines={2}>
                  {artist.name}
                </Text>
                {artist.genres?.length ? (
                  <Text style={styles.heroGenres} numberOfLines={1}>
                    {artist.genres.slice(0, 3).join(' · ')}
                  </Text>
                ) : null}
              </View>
            </>
          ) : (
            <View style={[styles.heroFallback, { height: heroHeight }]} />
          )}
        </View>

        {/* Fallback name block — only when there's no media to embed on. */}
        {!heroImage ? (
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={2}>
              {artist.name}
            </Text>
            {artist.genres?.length ? (
              <Text style={styles.genres} numberOfLines={1}>
                {artist.genres.slice(0, 3).join(' · ')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Tracking ✓ / Share ── */}
        <View style={styles.actionRow}>
          <PillButton
            title={isFollowing ? 'Tracking' : 'Track'}
            variant={isFollowing ? 'secondary' : 'primary'}
            springFeedback
            haptic="light"
            disabled={followBusy}
            icon={
              isFollowing ? (
                <Ionicons name="checkmark" size={14} color={tokens.colors.fg} />
              ) : undefined
            }
            onPress={() => void handleFollow()}
          />
          <PillButton
            title="Share"
            variant="secondary"
            springFeedback
            haptic="light"
            icon={<Ionicons name="share-outline" size={14} color={tokens.colors.mute} />}
            onPress={() => void handleShare()}
          />
          {artist.followerCount > 0 ? (
            <Text style={styles.followers}>
              {artist.followerCount.toLocaleString()} followers
            </Text>
          ) : null}
        </View>

        {/* ── YOU × ARTIST — seen / your avg / first year (all mono) ── */}
        {youStats ? (
          <View style={styles.section}>
            <Animated.View entering={FadeInDown.duration(240)} style={styles.youCard}>
              <Text style={styles.youLabel}>YOU × {artist.name.toUpperCase()}</Text>
              <View style={styles.youStatsRow}>
                <StatBlock value={`×${youStats.shows}`} label="Seen" />
                {youStats.avgNum != null ? (
                  // The user's own score wears the stamp (C2 flat-surface body).
                  <View style={styles.youScoreBlock}>
                    <ScoreStamp score={youStats.avgNum} size={14} />
                    <Text style={styles.youScoreLabel}>Your avg</Text>
                  </View>
                ) : (
                  <StatBlock value="—" label="Your avg" />
                )}
                <StatBlock value={youStats.firstYear} label="First year" />
              </View>
            </Animated.View>
          </View>
        ) : null}

        {/* ── WHO'S SEEN THEM — C15 degree facepile, non-tappable v1 (see
               lib/api/whoSaw.ts note). ── */}
        {whoSawStatus === 'loading' ? (
          <View style={styles.section}>
            <SectionLabel>Who&apos;s seen them</SectionLabel>
            <View style={styles.whoRow}>
              <ShimmerBlock width={110} height={36} borderRadius={18} />
              <ShimmerBlock width={100} height={12} borderRadius={6} />
            </View>
          </View>
        ) : whoSaw && whoSaw.people.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>Who&apos;s seen them</SectionLabel>
            <Animated.View entering={FadeInDown.duration(240)} style={styles.whoRow}>
              <DegreeFacepile people={whoSaw.people} totalCount={whoSaw.totalCount} size={32} surfaceColor={tokens.colors.bg} />
              <Text style={styles.whoCaption}>{whoSawCaption}</Text>
            </Animated.View>
          </View>
        ) : null}

        {/* ── ON TOUR ── */}
        <View style={styles.section}>
          <SectionLabel>On tour</SectionLabel>
          {upcomingStatus === 'loading' ? (
            <View style={{ marginHorizontal: -tokens.density.pad }}>
              <RowSkeletons count={2} />
            </View>
          ) : upcoming.length === 0 ? (
            <QuietEmpty text="No upcoming dates on the books." />
          ) : (
            <>
              {upcoming.slice(0, 8).map((show, i) => (
                <Animated.View
                  key={show.id}
                  entering={tearIn(Math.min(i, 8) * durations.stagger)}
                >
                  <SpringPressable
                    haptic="light"
                    onPress={() =>
                      router.push({ pathname: '/event/[eventId]', params: { eventId: show.id } })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${show.title}, ${show.meta}`}
                    style={styles.row}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {show.title}
                      </Text>
                      {show.meta ? (
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {show.meta}
                        </Text>
                      ) : null}
                    </View>
                    <MonoChip label={monoDate(show.date)} />
                    <Ionicons name="chevron-forward" size={15} color={tokens.colors.muteSoft} />
                  </SpringPressable>
                </Animated.View>
              ))}
              {upcoming.length > 8 ? (
                <Text style={styles.moreDates}>+{upcoming.length - 8} more dates</Text>
              ) : null}
            </>
          )}
        </View>

        {/* ── ALL TOURS ── */}
        <View style={styles.section}>
          <SectionLabel>All tours</SectionLabel>
          {toursStatus === 'loading' ? (
            <View style={{ marginHorizontal: -tokens.density.pad }}>
              <RowSkeletons count={2} />
            </View>
          ) : tours.length === 0 ? (
            <QuietEmpty
              text={
                toursStatus === 'error'
                  ? "Couldn't load tours right now."
                  : 'No tours on record yet.'
              }
            />
          ) : (
            tours.map((tour, i) => (
              <Animated.View
                key={tour.id}
                entering={tearIn(Math.min(i, 8) * durations.stagger)}
              >
                <SpringPressable
                  haptic="light"
                  onPress={() =>
                    router.push({
                      pathname: '/tour/[tourId]',
                      params: {
                        tourId: tour.id,
                        artistId: id,
                        artistName: artist.name,
                        tourName: tour.name,
                        ...(tour.year != null ? { year: String(tour.year) } : {}),
                        eventCount: String(tour.eventCount),
                        ...(tour.avgScore != null ? { avgScore: String(tour.avgScore) } : {}),
                        scoredLogCount: String(tour.scoredLogCount),
                      },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${tour.name} tour`}
                  style={styles.row}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitleStrong} numberOfLines={1}>
                      {tour.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[
                        tour.year != null ? String(tour.year) : null,
                        `${tour.eventCount} ${tour.eventCount === 1 ? 'show' : 'shows'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {tour.avgScore != null ? (
                    <MonoChip label={formatScore(tour.avgScore)} />
                  ) : null}
                  <Ionicons name="chevron-forward" size={15} color={tokens.colors.muteSoft} />
                </SpringPressable>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      <EntityNav onBack={goBack} onShare={() => void handleShare()} floating />
    </View>
  );
}
