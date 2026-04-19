import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonoLabel } from '../../components/ui/MonoLabel';
import { StatPill } from '../../components/ui/StatPill';

import { useArtist } from '../../hooks/useArtist';
import { useArtistShows } from '../../hooks/useArtistShows';
import { useArtistFollow } from '../../hooks/useArtistFollow';
import { useSession } from '../../hooks/useSession';

import { markInterested, removeInterested } from '../../lib/api/events';
import type { ArtistShow } from '../../types/artist';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { colors, accentSets, radius } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;
const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' }) as string;

export default function ArtistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const { user } = useSession();

  const id = artistId ? String(artistId) : '';

  const { artist, loading, error, refetch, updateFollowing } = useArtist(id);
  const { isFollowing, setIsFollowing, toggleFollow, loading: followLoading } = useArtistFollow();

  const upcoming = useArtistShows(id, true);
  const past = useArtistShows(id, false);

  const [refreshing, setRefreshing] = useState(false);
  const goBack = useSafeBack();

  useEffect(() => {
    if (artist) {
      setIsFollowing(artist.isFollowing);
    }
  }, [artist, setIsFollowing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), upcoming.refresh(), past.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = goBack;

  const handleShare = async () => {
    if (!artist) return;
    try {
      await Share.share({
        title: artist.name,
        message: `Check out ${artist.name} on Sticket!`,
        url: `https://sticket.in/artist/${id}`,
      });
    } catch (shareError) {
      console.error('Share failed:', shareError);
    }
  };

  const handleFollowPress = async () => {
    if (!id) return;
    await toggleFollow(id);
    updateFollowing(!isFollowing);
  };

  const handleShowPress = (showId: string) => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: showId } });
  };

  const handleInterestedPress = async (showId: string, current: boolean) => {
    try {
      if (current) {
        await removeInterested(showId);
      } else {
        await markInterested(showId);
      }
      upcoming.updateInterested(showId, !current);
    } catch (interestError) {
      console.error('Interest toggle failed:', interestError);
    }
  };

  const handleLogPress = (show: ArtistShow) => {
    router.push({ pathname: '/log/details', params: { eventId: show.id } });
  };

  const handleFriendPress = (userId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: userId } });
  };

  const handleSeeAllHistory = () => {
    if (user?.id) {
      router.push({ pathname: '/profile/[id]', params: { id: user.id } });
    }
  };

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // --- Loading ---
  if (loading && !artist) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={accentSets.cyan.hex} />
      </View>
    );
  }

  // --- Error ---
  if (error || !artist) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Couldn't load artist</Text>
        <Text style={styles.errorSubtitle}>{error || 'Unknown error'}</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backButtonError} onPress={handleBack}>
          <Text style={styles.backButtonErrorText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Derive data
  const allShows = [...past.shows];
  const hasHistory = artist.userShowCount > 0;
  const hasUpcomingTour = upcoming.shows.length > 0;
  const firstUpcoming = upcoming.shows[0];

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
          {artist.imageUrl ? (
            <Image source={{ uri: artist.imageUrl }} style={styles.heroCover} />
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
            <Text style={styles.artistLabel}>ARTIST</Text>
            <Text style={styles.artistName} numberOfLines={2}>
              {artist.name}
            </Text>
            {artist.genres.length > 0 && (
              <Text style={styles.originSubtitle}>{artist.genres.slice(0, 2).join(' / ')}</Text>
            )}
            <Text style={styles.monthlyListeners}>
              {artist.followerCount.toLocaleString()} FOLLOWERS
            </Text>
          </View>
        </View>

        {/* ====== 2. ACTION ROW ====== */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.followBtn, isFollowing && styles.followBtnFollowing]}
            onPress={handleFollowPress}
            disabled={followLoading}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextFollowing]}>
              {isFollowing ? '\u2713 Following' : 'Follow'}
            </Text>
          </Pressable>

          <Pressable style={styles.notifyBtn} onPress={handleShare}>
            <Ionicons name="notifications-outline" size={16} color={colors.textHi} />
          </Pressable>
        </View>

        {/* ====== 3. GENRE PILLS ====== */}
        {artist.genres.length > 0 && (
          <View style={styles.genrePillRow}>
            {artist.genres.map((genre) => (
              <View key={genre} style={styles.genrePill}>
                <Text style={styles.genrePillText}>{genre.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ====== 4. BIO ====== */}
        {artist.bio ? (
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>{artist.bio}</Text>
          </View>
        ) : null}

        {/* ====== 5. YOUR HISTORY ====== */}
        {hasHistory && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR HISTORY</Text>
            <View style={styles.statPillRow}>
              <StatPill
                value={artist.userShowCount}
                label="SHOWS SEEN"
                style={styles.statPill}
              />
              {artist.userFirstShow && (
                <StatPill
                  value={formatShortDate(artist.userFirstShow.date)}
                  label="FIRST SAW"
                  style={styles.statPill}
                />
              )}
            </View>
          </View>
        )}

        {/* ====== 6. UPCOMING TOUR ====== */}
        {hasUpcomingTour && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ON TOUR NOW</Text>
            <Pressable
              style={styles.tourCard}
              onPress={() => handleShowPress(firstUpcoming.id)}
            >
              <View style={styles.tourIcon}>
                <Ionicons name="musical-note" size={20} color={accentSets.cyan.hex} />
              </View>
              <View style={styles.tourInfo}>
                <Text style={styles.tourName} numberOfLines={1}>
                  {firstUpcoming.name}
                </Text>
                <Text style={styles.tourVenue} numberOfLines={1}>
                  Next: {firstUpcoming.venue.name}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLo} />
            </Pressable>
          </View>
        )}

        {/* ====== Upcoming shows list ====== */}
        {upcoming.shows.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              UPCOMING {upcoming.shows.length} SHOWS
            </Text>
            {upcoming.shows.map((show) => (
              <Pressable
                key={show.id}
                style={styles.miniShowRow}
                onPress={() => handleShowPress(show.id)}
              >
                <View style={styles.miniShowCover}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textLo} />
                </View>
                <View style={styles.miniShowInfo}>
                  <Text style={styles.miniShowArtist} numberOfLines={1}>
                    {show.name}
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

        {/* ====== 7. YOUR SHOWS (past) ====== */}
        {allShows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              YOUR {allShows.length} SHOWS
            </Text>
            {allShows.map((show) => (
              <Pressable
                key={show.id}
                style={styles.miniShowRow}
                onPress={() => handleShowPress(show.id)}
              >
                <View style={styles.miniShowCover}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.textLo} />
                </View>
                <View style={styles.miniShowInfo}>
                  <Text style={styles.miniShowArtist} numberOfLines={1}>
                    {show.name}
                  </Text>
                  <Text style={styles.miniShowVenue} numberOfLines={1}>
                    {show.venue.name}, {show.venue.city}
                  </Text>
                </View>
                <Text style={styles.miniShowDate}>{formatDate(show.date)}</Text>
              </Pressable>
            ))}

            {past.hasMore && (
              <Pressable style={styles.loadMoreBtn} onPress={past.loadMore}>
                <Text style={styles.loadMoreText}>
                  {past.loading ? 'Loading...' : 'Load more'}
                </Text>
              </Pressable>
            )}
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
  artistLabel: {
    fontFamily: MONO_FONT,
    fontSize: 10.5,
    color: accentSets.cyan.hex,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  artistName: {
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
  originSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  monthlyListeners: {
    fontFamily: MONO_FONT,
    fontSize: 10.5,
    color: colors.textLo,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── 2. Action Row ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  followBtn: {
    flex: 1,
    backgroundColor: accentSets.cyan.hex,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnFollowing: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  followBtnTextFollowing: {
    color: colors.textHi,
  },
  notifyBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 3. Genre Pills ──
  genrePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  genrePill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  genrePillText: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMid,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── 4. Bio ──
  bioContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bioText: {
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
    fontFamily: MONO_FONT,
    fontSize: 10.5,
    color: colors.textLo,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  statPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
  },

  // ── 6. Tour Card ──
  tourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: accentSets.cyan.line,
    borderRadius: radius.md,
    padding: 12,
    gap: 12,
  },
  tourIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: accentSets.cyan.soft,
    borderWidth: 1,
    borderColor: accentSets.cyan.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourInfo: {
    flex: 1,
  },
  tourName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHi,
    marginBottom: 2,
  },
  tourVenue: {
    fontSize: 12,
    color: colors.textMid,
  },

  // ── 7. Mini Show Row ──
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
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: colors.textLo,
    letterSpacing: 0.5,
  },

  // ── Load More ──
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    fontWeight: '600',
    color: accentSets.cyan.hex,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
