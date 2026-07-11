// Tour entity page — tour header + aggregate score.
//
// There is no tour-detail or per-tour-events endpoint on the API; the only
// tour data source is GET /artists/:id/tours. This page therefore hydrates
// from route params (passed by the artist page) and, when artistId is
// present, re-fetches that endpoint to confirm/refresh the metadata. The
// show-by-show list is honestly deferred until the API supports it.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EntityNav } from '../../components/entity/EntityChrome';
import { MonoChip, StatBlock } from '../../components/entity/EntityBits';
import { EntityError, ShimmerBlock } from '../../components/entity/EntityStates';
import { formatScore } from '../../components/entity/format';
import { SpringPressable } from '../../components/ui/SpringPressable';

import { getArtist, getArtistTours, type ArtistTour } from '../../lib/api/artists';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

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

type TourInfo = {
  name: string;
  year?: number;
  eventCount?: number;
  avgScore?: number;
  scoredLogCount?: number;
};

function fromParams(params: TourParams): TourInfo | null {
  if (!params.tourName) return null;
  return {
    name: String(params.tourName),
    year: params.year ? Number(params.year) : undefined,
    eventCount: params.eventCount ? Number(params.eventCount) : undefined,
    avgScore: params.avgScore ? Number(params.avgScore) : undefined,
    scoredLogCount: params.scoredLogCount ? Number(params.scoredLogCount) : undefined,
  };
}

function fromApi(tour: ArtistTour): TourInfo {
  return {
    name: tour.name,
    year: tour.year,
    eventCount: tour.eventCount,
    avgScore: tour.avgScore,
    scoredLogCount: tour.scoredLogCount,
  };
}

export default function TourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<TourParams>();

  const tourId = params.tourId ? String(params.tourId) : '';
  const artistId = params.artistId ? String(params.artistId) : '';

  const paramInfo = useMemo(() => fromParams(params), [params]);

  const [fetched, setFetched] = useState<TourInfo | null>(null);
  const [artistName, setArtistName] = useState<string>(
    params.artistName ? String(params.artistName) : '',
  );
  const [loading, setLoading] = useState(Boolean(artistId));
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!artistId || !tourId) {
      setLoading(false);
      return;
    }
    const wantArtistName = !params.artistName;
    const [toursRes, artistRes] = await Promise.allSettled([
      getArtistTours(artistId),
      wantArtistName ? getArtist(artistId) : Promise.resolve(null),
    ]);
    if (toursRes.status === 'fulfilled') {
      const match = toursRes.value.find((t) => t.id === tourId);
      if (match) setFetched(fromApi(match));
    }
    if (artistRes.status === 'fulfilled' && artistRes.value) {
      setArtistName(artistRes.value.name);
    }
    setLoading(false);
  }, [artistId, tourId, params.artistName]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const tour = fetched ?? paramInfo;

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    content: { paddingHorizontal: t.density.pad },
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
    scoreCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      marginTop: 24,
      gap: 16,
    },
    bigScore: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 40,
      color: t.colors.fg,
    },
    bigScoreLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 2,
    },
    statsRow: { flexDirection: 'row', gap: 12 },
    soonCard: {
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.lg,
      padding: t.density.cardPad,
      marginTop: 16,
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
    },
    soonBody: { flex: 1, gap: 3 },
    soonTitle: { fontSize: 14, fontWeight: '600', color: t.colors.fg },
    soonText: { fontSize: 13, color: t.colors.mute, lineHeight: 19 },
  }));

  // ── Nothing to render at all: no params, nothing fetched ──
  if (!loading && !tour) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingTop: insets.top }}>
          <EntityNav onBack={goBack} />
        </View>
        <EntityError
          title="This tour isn't linked yet"
          message="Open it from an artist page to see its details."
          onBack={goBack}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        refreshControl={
          artistId ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={tokens.colors.mute}
              colors={[tokens.colors.fg]}
              progressBackgroundColor={tokens.colors.card2}
            />
          ) : undefined
        }
      >
        <View style={styles.content}>
          {loading && !tour ? (
            <View style={{ paddingTop: 18, gap: 12 }}>
              <ShimmerBlock width={64} height={12} borderRadius={6} />
              <ShimmerBlock width="72%" height={26} borderRadius={8} />
              <ShimmerBlock width="40%" height={14} borderRadius={7} />
              <ShimmerBlock width="100%" height={120} borderRadius={tokens.radius.lg} />
            </View>
          ) : tour ? (
            <>
              <Text style={styles.eyebrow}>Tour</Text>
              <Text style={styles.name}>{tour.name}</Text>

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

              {tour.year != null && Number.isFinite(tour.year) ? (
                <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <MonoChip label={String(tour.year)} />
                </View>
              ) : null}

              <Animated.View entering={FadeInDown.duration(240)} style={styles.scoreCard}>
                <View>
                  <Text style={styles.bigScore}>
                    {tour.avgScore != null && Number.isFinite(tour.avgScore)
                      ? formatScore(tour.avgScore)
                      : '—'}
                  </Text>
                  <Text style={styles.bigScoreLabel}>Community avg score</Text>
                </View>
                <View style={styles.statsRow}>
                  <StatBlock
                    value={
                      tour.eventCount != null && Number.isFinite(tour.eventCount)
                        ? String(tour.eventCount)
                        : '—'
                    }
                    label="Shows"
                  />
                  <StatBlock
                    value={
                      tour.scoredLogCount != null && Number.isFinite(tour.scoredLogCount)
                        ? String(tour.scoredLogCount)
                        : '—'
                    }
                    label="Scored logs"
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(80).duration(240)} style={styles.soonCard}>
                <Ionicons name="list-outline" size={22} color={tokens.colors.mute} />
                <View style={styles.soonBody}>
                  <Text style={styles.soonTitle}>Show-by-show breakdown coming soon</Text>
                  <Text style={styles.soonText}>
                    Individual dates for this tour aren't wired up yet — the artist page has
                    upcoming shows in the meantime.
                  </Text>
                </View>
              </Animated.View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
