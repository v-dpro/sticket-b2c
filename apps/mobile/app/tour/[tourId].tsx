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
import { formatScore, monoDateYear } from '../../components/entity/format';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

import { getTour, getTourPhotos, type TourDetail, type TourPhoto } from '../../lib/api/tours';
import { durations, haptics } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

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

  useEffect(() => {
    setStatus('loading');
    setPhotosStatus('loading');
    void loadTour();
    void loadPhotos();
  }, [loadTour, loadPhotos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadTour(), loadPhotos()]);
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
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: t.colors.fg,
      marginTop: 8,
      lineHeight: 33,
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
                <MonoChip label={`${events.length} ${events.length === 1 ? 'SHOW' : 'SHOWS'}`} />
              ) : null}
              {avgScore != null ? <MonoChip label={`AVG ${formatScore(avgScore)}`} /> : null}
            </Animated.View>
          </>
        )}

        {/* ── Shows ── */}
        <View style={styles.section}>
          <SectionLabel>Shows</SectionLabel>
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
          ) : (
            events.map((event, i) => (
              <EventRow
                key={event.id}
                index={i}
                title={event.name}
                meta={`${event.venue.name} · ${event.venue.city} · ${monoDateYear(event.date)}`}
                logCount={event.logCount}
                avgScore={event.avgScore}
                onPress={() =>
                  router.push({
                    pathname: '/event/[eventId]',
                    params: {
                      eventId: event.id,
                      tourId,
                      ...(tourName ? { tourName } : {}),
                    },
                  })
                }
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
      entering={FadeInDown.delay(Math.min(index % PHOTO_PAGE, 8) * durations.stagger).duration(240)}
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
