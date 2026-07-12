// Tour entity page — header (tour name, artist link, year, community avg)
// → SHOWS (show-by-show event rows → /event/[id]) → TOUR PHOTOS (3-col
// crowd-photo grid aggregated across the tour, infinite scroll, tap →
// the photo's memory at /log/[logId]).
//
// APIs: GET /tours/:id (tour + events) · GET /tours/:id/photos?cursor&limit.
// Route params passed by the artist page (tourName/year/avgScore…) hydrate
// the header instantly while the detail loads, and keep it meaningful if
// the fetch fails.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EntityNav } from '../../components/entity/EntityChrome';
import { MonoChip, QuietEmpty, SectionLabel } from '../../components/entity/EntityBits';
import { EntityError, RowSkeletons, ShimmerBlock } from '../../components/entity/EntityStates';
import { EventRow } from '../../components/entity/EventRow';
import {
  detectFestivalWeekend,
  FestivalWeekend,
  type FestivalLogRef,
} from '../../components/entity/FestivalWeekend';
import { formatScore, monoDateYear } from '../../components/entity/format';
import { DegreeFacepile } from '../../components/ui/DegreeFacepile';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

import { getUserTimeline } from '../../lib/api/timeline';
import { getTour, getTourPhotos, type TourDetail, type TourEvent, type TourPhoto } from '../../lib/api/tours';
import { getTourWhoSaw, type WhoSawResponse } from '../../lib/api/whoSaw';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';

const PHOTO_PAGE = 30;

type TourParams = {
  tourId: string;
  artistId?: string;
  artistName?: string;
  tourName?: string;
  year?: string;
  eventCount?: string;
  avgScore?: string;
  scoredLogCount?: string;
};

type AsyncStatus = 'loading' | 'ready' | 'error';

export default function TourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<TourParams>();

  const tourId = params.tourId ? String(params.tourId) : '';

  const [detail, setDetail] = useState<TourDetail | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const [photos, setPhotos] = useState<TourPhoto[]>([]);
  const [photosStatus, setPhotosStatus] = useState<AsyncStatus>('loading');
  const [photoCursor, setPhotoCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const photosBusy = useRef(false);

  const [whoSaw, setWhoSaw] = useState<WhoSawResponse | null>(null);
  const [whoSawStatus, setWhoSawStatus] = useState<AsyncStatus>('loading');

  const loadTour = useCallback(async () => {
    if (!tourId) {
      setStatus('error');
      return;
    }
    try {
      const res = await getTour(tourId);
      setDetail(res);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [tourId]);

  const loadPhotos = useCallback(async () => {
    if (!tourId) return;
    try {
      const res = await getTourPhotos(tourId, { limit: PHOTO_PAGE });
      setPhotos(Array.isArray(res?.items) ? res.items : []);
      setPhotoCursor(res?.nextCursor ?? null);
      setPhotosStatus('ready');
    } catch {
      setPhotos([]);
      setPhotosStatus('error');
    }
  }, [tourId]);

  const loadWhoSaw = useCallback(async () => {
    if (!tourId) return;
    try {
      const res = await getTourWhoSaw(tourId);
      setWhoSaw(res);
      setWhoSawStatus('ready');
    } catch {
      setWhoSaw(null);
      setWhoSawStatus('error');
    }
  }, [tourId]);

  useEffect(() => {
    setStatus('loading');
    setPhotosStatus('loading');
    setWhoSawStatus('loading');
    void loadTour();
    void loadPhotos();
    void loadWhoSaw();
  }, [loadTour, loadPhotos, loadWhoSaw]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadTour(), loadPhotos(), loadWhoSaw()]);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMorePhotos = useCallback(async () => {
    if (!photoCursor || photosBusy.current) return;
    photosBusy.current = true;
    setLoadingMore(true);
    try {
      const res = await getTourPhotos(tourId, { cursor: photoCursor, limit: PHOTO_PAGE });
      const next = Array.isArray(res?.items) ? res.items : [];
      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.id))];
      });
      setPhotoCursor(res?.nextCursor ?? null);
    } catch {
      // quiet — scrolling again retries
    } finally {
      photosBusy.current = false;
      setLoadingMore(false);
    }
  }, [photoCursor, tourId]);

  // ── Header display model: fetched detail, falling back to params ──
  const tourName = detail?.tour.name ?? (params.tourName ? String(params.tourName) : '');
  const tourYear =
    detail?.tour.year ?? (params.year && Number.isFinite(Number(params.year)) ? Number(params.year) : null);
  const artistId = detail?.tour.artist.id ?? (params.artistId ? String(params.artistId) : '');
  const artistName = detail?.tour.artist.name ?? (params.artistName ? String(params.artistName) : '');

  const events = detail?.events ?? [];

  // ── FESTIVAL MODE (C12) — client-side shape detection only ──
  // 2+ events at one venue within a 4-day window ⇒ the show list renders
  // as a festival weekend (day tabs + schedule rows). Everything else is
  // untouched — plain tours keep the exact EventRow list below.
  const festival = useMemo(() => detectFestivalWeekend(events), [events]);

  // The viewer's own logs on the weekend's sets (per-set ScoreStamps +
  // the stub card's "M LOGGED · BEST" line). Sourced from the owner
  // timeline — the only client API that pairs eventId with the log's
  // score — walking its date-descending cursor until it passes the
  // weekend's earliest set. Quietly optional: on failure the schedule
  // simply renders without stamps.
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [myLogsByEvent, setMyLogsByEvent] = useState<Record<string, FestivalLogRef>>({});

  useEffect(() => {
    if (!festival || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const wanted = new Set(festival.events.map((e) => e.id));
        const earliest = new Date(festival.events[0]!.date).getTime();
        const found: Record<string, FestivalLogRef> = {};
        let cursor: string | undefined;
        for (let page = 0; page < 6; page++) {
          const res = await getUserTimeline(userId, { cursor, limit: 50 });
          for (const month of res.months) {
            for (const entry of month.entries) {
              if (wanted.has(entry.event.id) && !found[entry.event.id]) {
                found[entry.event.id] = { logId: entry.logId, score: entry.score };
              }
            }
          }
          if (!res.nextCursor) break;
          const cursorTime = new Date(res.nextCursor).getTime();
          if (Number.isFinite(cursorTime) && cursorTime < earliest) break;
          cursor = res.nextCursor;
        }
        if (!cancelled) setMyLogsByEvent(found);
      } catch {
        // quiet — stamps are an enhancement, the schedule stands alone
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [festival, userId]);

  // Community avg — log-count-weighted mean of the events' avg scores;
  // param fallback keeps the chip alive before/without the detail.
  const avgScore = useMemo(() => {
    const scored = events.filter(
      (e) => typeof e.avgScore === 'number' && Number.isFinite(e.avgScore),
    );
    if (scored.length > 0) {
      let weightSum = 0;
      let total = 0;
      for (const e of scored) {
        const w = e.logCount > 0 ? e.logCount : 1;
        weightSum += w;
        total += (e.avgScore as number) * w;
      }
      return total / weightSum;
    }
    const fromParams = params.avgScore ? Number(params.avgScore) : NaN;
    return Number.isFinite(fromParams) ? fromParams : null;
  }, [events, params.avgScore]);

  // WHO'S SEEN THEM caption — "4 FRIENDS · 12 IN YOUR ORBIT · 47 TOTAL".
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

  // Shared by the plain show rows and the festival schedule rows.
  const openEvent = useCallback(
    (event: TourEvent) =>
      router.push({
        pathname: '/event/[eventId]',
        params: {
          eventId: event.id,
          tourId,
          ...(tourName ? { tourName } : {}),
        },
      }),
    [router, tourId, tourName],
  );

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    headerBlock: { paddingHorizontal: t.density.pad },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 18,
    },
    name: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 8,
      lineHeight: 29,
    },
    artistLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    artistLinkText: { fontSize: 14, fontWeight: '600', color: t.colors.mute },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    section: { marginTop: 28 },
    retryRow: { flexDirection: 'row', marginTop: 10 },
    photoCell: { width: '33.333%', padding: 2 },
    photo: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
    footer: { paddingVertical: 20 },
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

  // ── Full-page error: fetch failed and params gave us nothing ──
  if (status === 'error' && !tourName) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingTop: insets.top }}>
          <EntityNav onBack={goBack} />
        </View>
        <EntityError
          title="Couldn't load this tour"
          onRetry={() => {
            setStatus('loading');
            void loadTour();
            void loadPhotos();
          }}
          onBack={goBack}
        />
      </View>
    );
  }

  const header = (
    <View>
      <View style={styles.headerBlock}>
        {status === 'loading' && !tourName ? (
          <View style={{ paddingTop: 18, gap: 12 }}>
            <ShimmerBlock width={64} height={12} borderRadius={6} />
            <ShimmerBlock width="72%" height={26} borderRadius={8} />
            <ShimmerBlock width="40%" height={14} borderRadius={7} />
          </View>
        ) : (
          <>
            <Text style={styles.eyebrow}>Tour</Text>
            <Text style={styles.name}>{tourName}</Text>

            {artistName ? (
              <SpringPressable
                haptic="light"
                disabled={!artistId}
                shakeWhenDisabled={false}
                onPress={() =>
                  router.push({ pathname: '/artist/[artistId]', params: { artistId } })
                }
                accessibilityRole="button"
                accessibilityLabel={`Go to ${artistName}`}
                style={styles.artistLink}
              >
                <Text style={styles.artistLinkText}>{artistName}</Text>
                {artistId ? (
                  <Ionicons name="chevron-forward" size={13} color={tokens.colors.muteSoft} />
                ) : null}
              </SpringPressable>
            ) : null}

            <Animated.View entering={FadeInDown.duration(240)} style={styles.chipsRow}>
              {tourYear != null && Number.isFinite(tourYear) ? (
                <MonoChip label={String(tourYear)} />
              ) : null}
              {events.length > 0 ? (
                <MonoChip
                  label={
                    festival
                      ? `${events.length} SETS`
                      : `${events.length} ${events.length === 1 ? 'SHOW' : 'SHOWS'}`
                  }
                />
              ) : null}
              {avgScore != null ? <MonoChip label={`AVG ${formatScore(avgScore)}`} /> : null}
            </Animated.View>
          </>
        )}

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

        {/* ── Shows (or the festival-weekend schedule) ── */}
        <View style={styles.section}>
          <SectionLabel>{festival ? 'Schedule' : 'Shows'}</SectionLabel>
          {status === 'loading' ? (
            <View style={{ marginHorizontal: -tokens.density.pad }}>
              <RowSkeletons count={4} />
            </View>
          ) : status === 'error' ? (
            <>
              <QuietEmpty text="Couldn't load this tour's shows." />
              <View style={styles.retryRow}>
                <PillButton
                  title="Try again"
                  variant="secondary"
                  size="sm"
                  springFeedback
                  haptic="light"
                  onPress={() => {
                    setStatus('loading');
                    void loadTour();
                  }}
                />
              </View>
            </>
          ) : events.length === 0 ? (
            <QuietEmpty text="No shows on record for this tour yet." />
          ) : festival ? (
            <FestivalWeekend
              festival={festival}
              tourName={tourName}
              myLogs={myLogsByEvent}
              onPressEvent={openEvent}
            />
          ) : (
            events.map((event, i) => (
              <EventRow
                key={event.id}
                index={i}
                title={event.name}
                meta={`${event.venue.name} · ${event.venue.city} · ${monoDateYear(event.date)}`}
                logCount={event.logCount}
                avgScore={event.avgScore}
                onPress={() => openEvent(event)}
              />
            ))
          )}
        </View>

        {/* ── Tour photos label ── */}
        <View style={styles.section}>
          <SectionLabel>Tour photos</SectionLabel>
          {photosStatus === 'loading' ? (
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <ShimmerBlock height={110} borderRadius={tokens.radius.sm} />
              </View>
              <View style={{ flex: 1 }}>
                <ShimmerBlock height={110} borderRadius={tokens.radius.sm} />
              </View>
              <View style={{ flex: 1 }}>
                <ShimmerBlock height={110} borderRadius={tokens.radius.sm} />
              </View>
            </View>
          ) : photosStatus === 'error' ? (
            <QuietEmpty text="Couldn't load tour photos right now." />
          ) : photos.length === 0 ? (
            <QuietEmpty text="No photos from this tour yet — memories with photos land here." />
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderPhoto = ({ item, index }: { item: TourPhoto; index: number }) => (
    <Animated.View
      entering={tearIn(Math.min(index % PHOTO_PAGE, 8) * durations.stagger)}
      style={styles.photoCell}
    >
      <Pressable
        onPress={() => {
          haptics.light();
          router.push({ pathname: '/log/[id]', params: { id: item.logId } });
        }}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Photo from ${item.eventName} — open memory`}
      >
        <Image
          source={{ uri: item.thumbnailUrl ?? item.photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={80}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
        />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} />
      </View>

      <Animated.FlatList
        data={photosStatus === 'ready' ? photos : []}
        keyExtractor={(item: TourPhoto) => item.id}
        renderItem={renderPhoto}
        numColumns={3}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={9}
        windowSize={7}
        columnWrapperStyle={{ paddingHorizontal: tokens.density.pad - 2 }}
        ListHeaderComponent={header}
        onEndReached={() => void loadMorePhotos()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
