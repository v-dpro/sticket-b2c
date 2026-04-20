import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Text,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatPill } from '../../components/ui/StatPill';

import { apiClient } from '../../lib/api/client';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;
// ── Types ──────────────────────────────────────────────────

type TourShow = {
  id: string;
  name: string;
  date: string;
  venue: { id: string; name: string; city: string };
  artistName: string;
  coverUrl?: string;
  status?: 'available' | 'sold_out';
};

type TourData = {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  artistImageUrl?: string;
  coverUrl?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  rating?: number;
  reviewCount?: number;
  dateCount?: number;
  userShowCount?: number;
  userShows?: TourShow[];
  upcomingShows?: TourShow[];
};

// ── Component ──────────────────────────────────────────────

export default function TourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const goBack = useSafeBack();

  const id = tourId ? String(tourId) : '';

  const [tour, setTour] = useState<TourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTour = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await apiClient.get(`/tours/${id}`);
      setTour(res.data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load tour');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTour();
    setRefreshing(false);
  };

  const handleBack = goBack;

  const handleShare = async () => {
    if (!tour) return;
    try {
      await Share.share({
        title: tour.name,
        message: `Check out the ${tour.name} tour on Sticket!`,
        url: `https://sticket.in/tour/${id}`,
      });
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  const handleArtistPress = () => {
    if (!tour?.artistId) return;
    router.push({ pathname: '/artist/[artistId]', params: { artistId: tour.artistId } });
  };

  const handleShowPress = (showId: string) => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: showId } });
  };

  // ── Helpers ──

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return '';
    const s = new Date(start);
    const startStr = s.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!end) return startStr;
    const e = new Date(end);
    const endStr = e.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startStr} — ${endStr}`;
  };

  const formatShowDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    return { month, day: String(day) };
  };

  // ── Loading ──
  if (loading && !tour) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={accentSets.cyan.hex} />
      </View>
    );
  }

  // ── Error ──
  if (error || !tour) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Couldn't load tour</Text>
        <Text style={styles.errorSubtitle}>{error || 'Unknown error'}</Text>
        <Pressable style={styles.retryButton} onPress={fetchTour}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backButtonError} onPress={handleBack}>
          <Text style={styles.backButtonErrorText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const userShows = tour.userShows ?? [];
  const upcomingShows = tour.upcomingShows ?? [];
  const hasUserShows = userShows.length > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentSets.cyan.hex} />
        }
      >
        {/* ====== 1. HERO ====== */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          {tour.coverUrl ? (
            <Image source={{ uri: tour.coverUrl }} style={styles.heroCover} />
          ) : (
            <View style={[styles.heroCover, { backgroundColor: colors.surface }]} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(11,11,20,0.85)', colors.ink]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top buttons */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={handleBack} style={styles.topButton}>
              <Ionicons name="arrow-back" size={20} color={colors.textHi} />
            </Pressable>
            <Pressable onPress={handleShare} style={styles.topButton}>
              <Ionicons name="share-outline" size={20} color={colors.textHi} />
            </Pressable>
          </View>

          {/* Hero text */}
          <View style={styles.heroText}>
            <Text style={styles.tourLabel}>TOUR</Text>
            <Text style={styles.tourName} numberOfLines={2}>
              {tour.name}
            </Text>
            <Text style={styles.artistSubtitle}>{tour.artistName}</Text>
            {(tour.startDate || tour.endDate) && (
              <Text style={styles.dateRange}>
                {formatDateRange(tour.startDate, tour.endDate)}
              </Text>
            )}
          </View>
        </View>

        {/* ====== 2. ARTIST + RATING ROW ====== */}
        <View style={styles.artistRatingRow}>
          <Pressable style={styles.artistButton} onPress={handleArtistPress}>
            <LinearGradient
              colors={[accentSets.cyan.hex, accentSets.purple.hex]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.artistGradientCircle}
            >
              {tour.artistImageUrl ? (
                <Image
                  source={{ uri: tour.artistImageUrl }}
                  style={styles.artistCircleImage}
                />
              ) : (
                <Text style={styles.artistCircleInitial}>
                  {(tour.artistName?.[0] ?? 'A').toUpperCase()}
                </Text>
              )}
            </LinearGradient>
            <Text style={styles.artistButtonName} numberOfLines={1}>
              {tour.artistName}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textLo} />
          </Pressable>

          {tour.rating !== undefined && (
            <Text style={styles.ratingValue}>{tour.rating.toFixed(1)}</Text>
          )}
        </View>

        {/* ====== 3. STAT PILLS ====== */}
        <View style={styles.statPillRow}>
          {tour.userShowCount !== undefined && tour.userShowCount > 0 && (
            <StatPill value={tour.userShowCount} label="YOU WENT" style={styles.statPill} />
          )}
          {tour.reviewCount !== undefined && (
            <StatPill value={tour.reviewCount} label="REVIEWS" style={styles.statPill} />
          )}
          {tour.dateCount !== undefined && (
            <StatPill value={tour.dateCount} label="DATES" style={styles.statPill} />
          )}
        </View>

        {/* ====== 4. DESCRIPTION ====== */}
        {tour.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{tour.description}</Text>
          </View>
        ) : null}

        {/* ====== 5. YOUR SHOWS ====== */}
        {hasUserShows && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              YOU SAW THIS TOUR {userShows.length}x
            </Text>
            {userShows.map((show) => (
              <Pressable
                key={show.id}
                style={styles.miniShowRow}
                onPress={() => handleShowPress(show.id)}
              >
                <View style={styles.miniShowCover}>
                  {show.coverUrl ? (
                    <Image source={{ uri: show.coverUrl }} style={styles.miniShowCoverImage} />
                  ) : (
                    <Ionicons name="musical-notes-outline" size={18} color={colors.textLo} />
                  )}
                </View>
                <View style={styles.miniShowInfo}>
                  <Text style={styles.miniShowArtist} numberOfLines={1}>
                    {show.artistName}
                  </Text>
                  <Text style={styles.miniShowVenue} numberOfLines={1}>
                    {show.venue.name}, {show.venue.city}
                  </Text>
                </View>
                <Text style={styles.miniShowDate}>{formatDate(show.date)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ====== 6. UPCOMING DATES ====== */}
        {upcomingShows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.upcomingHeader}>
              <Text style={styles.sectionLabel}>UPCOMING DATES NEAR YOU</Text>
              <Pressable onPress={() => {}}>
                <Text style={styles.seeAllText}>SEE ALL</Text>
              </Pressable>
            </View>
            {upcomingShows.map((show) => {
              const { month, day } = formatShowDate(show.date);
              const isSoldOut = show.status === 'sold_out';
              return (
                <Pressable
                  key={show.id}
                  style={styles.upcomingRow}
                  onPress={() => handleShowPress(show.id)}
                >
                  {/* Date column */}
                  <View style={styles.dateColumn}>
                    <Text style={styles.dateMonth}>{month}</Text>
                    <Text style={styles.dateDay}>{day}</Text>
                  </View>

                  {/* Venue info */}
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingVenue} numberOfLines={1}>
                      {show.venue.name}
                    </Text>
                    <Text style={styles.upcomingCity} numberOfLines={1}>
                      {show.venue.city}
                    </Text>
                  </View>

                  {/* Status badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      isSoldOut
                        ? { backgroundColor: colors.surface }
                        : { backgroundColor: accentSets.cyan.soft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: isSoldOut ? colors.textMuted : accentSets.cyan.hex },
                      ]}
                    >
                      {isSoldOut ? 'SOLD OUT' : 'TIX'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scrollView: {
    flex: 1,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: colors.textHi,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: colors.textMid,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: accentSets.cyan.hex,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.ink,
    fontWeight: '700',
  },
  backButtonError: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButtonErrorText: {
    color: accentSets.cyan.hex,
    fontWeight: '700',
  },

  // ── 1. Hero ──
  hero: {
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  heroCover: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    resizeMode: 'cover',
  } as any,
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  tourLabel: {
    fontFamily: fontFamilies.mono,
    fontSize: 10.5,
    color: accentSets.cyan.hex,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tourName: {
    fontSize: 36,
    fontWeight: '400',
    color: colors.textHi,
    letterSpacing: -0.8,
    lineHeight: 36 * 1.05,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  artistSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  dateRange: {
    fontFamily: fontFamilies.mono,
    fontSize: 10.5,
    color: colors.textLo,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── 2. Artist + Rating Row ──
  artistRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  artistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  artistGradientCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistCircleImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  artistCircleInitial: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  artistButtonName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: accentSets.cyan.hex,
  },

  // ── 3. Stat Pills ──
  statPillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statPill: {
    flex: 1,
  },

  // ── 4. Description ──
  descriptionContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textMid,
    lineHeight: 14 * 1.5,
  },

  // ── 5. Section ──
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: fontFamilies.mono,
    fontSize: 10.5,
    color: colors.textLo,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Mini show row
  miniShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  miniShowCover: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  miniShowCoverImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  miniShowInfo: {
    flex: 1,
    marginRight: 8,
  },
  miniShowArtist: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHi,
    marginBottom: 2,
  },
  miniShowVenue: {
    fontSize: 12,
    color: colors.textMid,
  },
  miniShowDate: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    color: colors.textLo,
    letterSpacing: 0.5,
  },

  // ── 6. Upcoming dates ──
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: accentSets.cyan.hex,
    letterSpacing: 1,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    gap: 12,
  },
  dateColumn: {
    width: 44,
    alignItems: 'center',
  },
  dateMonth: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 9,
    fontWeight: '700',
    color: accentSets.cyan.hex,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dateDay: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 20,
    fontWeight: '700',
    color: accentSets.cyan.hex,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingVenue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
    marginBottom: 2,
  },
  upcomingCity: {
    fontSize: 12,
    color: colors.textMid,
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusBadgeText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
