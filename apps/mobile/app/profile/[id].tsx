// app/profile/[id].tsx — ANOTHER USER'S PROFILE: their timeline is the hero.
// A tight masthead (avatar · name · Follow · mono stats) sits over a
// TIMELINE / ARTISTS / VENUES segmented stage. TIMELINE spins the same
// MemoryDeck wheel as the Timeline tab — the faces are shared via
// components/timeline/deckFaces so the two can't drift; the profile keeps
// the deck's built-in compact month readout instead of the tab's big
// header. ARTISTS is their seen-artist collection; VENUES is their map +
// venue list. Privacy is server-enforced: `restricted: true` profiles get
// a quiet private card, and the timeline/artists/venues endpoints return
// [] when the owner's show* flag is off — those render "private" states
// distinct from a true empty (inferred from the profile's stat counts).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CompactProfileHeader } from '../../components/profile/CompactProfileHeader';
import { FriendsSheet } from '../../components/profile/FriendsSheet';
import { FollowingSheet } from '../../components/profile/FollowingSheet';
import { ProfileMapView } from '../../components/profile/MapView';
import { MemoryDeck, type DeckItem, type MemoryDeckHandle } from '../../components/timeline/MemoryDeck';
import { buildDeckItems, mergeMonths, useDeckFaces } from '../../components/timeline/deckFaces';
import { ErrorState } from '../../components/ui/ErrorState';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { haptics } from '../../lib/motion';
import { useFollow } from '../../hooks/useFollow';
import { useProfile } from '../../hooks/useProfile';
import { useSession } from '../../hooks/useSession';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { getUserVenueMarkers } from '../../lib/api/profile';
import { getUserTimeline, type TimelineMonth, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { VenueMarker } from '../../types/profile';

const PAGE_SIZE = 30;

type ProfileSegment = 'timeline' | 'map';

const SEGMENTS: { value: ProfileSegment; label: string }[] = [
  { value: 'timeline', label: 'TIMELINE' },
  { value: 'map', label: 'MAP' },
];

export default function UserProfileScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const goBack = useSafeBack();

  const { profile, loading: profileLoading, refetch } = useProfile(id);
  const { user } = useSession();
  const { isFollowing, setIsFollowing, toggleFollow, loading: followLoading } = useFollow();
  // ?tab= deep-link (links + screenshot pipeline), default timeline.
  const [segment, setSegment] = useState<ProfileSegment>(tab === 'map' ? 'map' : 'timeline');
  const deckRef = useRef<MemoryDeckHandle>(null);
  useEffect(() => {
    if (tab === 'map' || tab === 'timeline') setSegment(tab);
  }, [tab]);

  // Masthead stat sheets.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  // Sync follow state when the profile loads.
  useEffect(() => {
    if (profile) setIsFollowing(profile.isFollowing || false);
  }, [profile, setIsFollowing]);

  // ── Their timeline (the hero) ─────────────────────────────────
  const [upcoming, setUpcoming] = useState<TimelineUpcomingItem[]>([]);
  const [months, setMonths] = useState<TimelineMonth[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [timelineStatus, setTimelineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadTimeline = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    try {
      const timeline = await getUserTimeline(id, { limit: PAGE_SIZE });
      setUpcoming(timeline.upcoming ?? []);
      setMonths(timeline.months ?? []);
      setNextCursor(timeline.nextCursor ?? null);
      setTimelineError(null);
      return true;
    } catch (e) {
      setTimelineError(getErrorMessage(e));
      return false;
    }
  }, [id]);

  // Refetched when follow flips: following can reveal FRIENDS-visibility logs.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setTimelineStatus('loading');
    void loadTimeline().then((ok) => {
      if (alive) setTimelineStatus(ok ? 'ready' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [id, isFollowing, loadTimeline]);

  const onDeckRefresh = useCallback(async () => {
    setRefreshing(true);
    const ok = await loadTimeline();
    if (ok) setTimelineStatus('ready');
    setRefreshing(false);
  }, [loadTimeline]);

  const loadMore = useCallback(async () => {
    if (!id || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const page = await getUserTimeline(id, { cursor: nextCursor, limit: PAGE_SIZE });
      setMonths((prev) => mergeMonths(prev, page.months ?? []));
      setNextCursor(page.nextCursor ?? null);
    } catch {
      // next near-end retries
    } finally {
      loadingMoreRef.current = false;
    }
  }, [id, nextCursor]);

  const deckItems = useMemo<DeckItem[]>(() => buildDeckItems(upcoming, months), [upcoming, months]);
  const initialDeckIndex = useMemo(() => {
    const firstEntry = deckItems.findIndex((d) => d.kind === 'entry');
    return firstEntry >= 0 ? firstEntry : Math.max(deckItems.length - 1, 0);
  }, [deckItems]);

  // The wheel's faces — shared with the Timeline tab (deckFaces.tsx).
  const { renderCard, renderLabel, readoutFor } = useDeckFaces();

  // ── Their venues (lazy on the MAP segment) ────────────────────
  // Fetched to tell a private map from a truly empty one; the full-height
  // map itself (ProfileMapView) loads its own markers.
  const [venues, setVenues] = useState<VenueMarker[] | null>(null);
  useEffect(() => {
    if (segment !== 'map' || !id) return;
    let alive = true;
    getUserVenueMarkers(id)
      .then((data) => {
        if (alive) setVenues([...data].sort((a, b) => b.showCount - a.showCount));
      })
      .catch(() => {
        if (alive) setVenues([]);
      });
    return () => {
      alive = false;
    };
  }, [segment, id, isFollowing]);

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    loadingContainer: { flex: 1, backgroundColor: t.colors.bg, justifyContent: 'center', alignItems: 'center' },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingVertical: 8,
    },
    backButton: { padding: 8 },
    topTitle: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: t.colors.fg,
    },
    // Segments — same monochrome track as TimelineViewToggle, stretched.
    segmentTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: t.density.pad,
      marginBottom: 8,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      padding: 2,
      gap: 2,
    },
    segment: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: t.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: { backgroundColor: t.colors.inverseBg },
    segmentLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    segmentLabelActive: { fontFamily: t.fontFamilies.monoBold, color: t.colors.inverseFg },
    stage: { flex: 1 },
    todayTicket: {
      position: 'absolute',
      bottom: 14,
      alignSelf: 'center',
      width: 66,
      height: 40,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
      backgroundColor: t.colors.inverseBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 7,
      elevation: 8,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    refreshHint: { position: 'absolute', top: 2, alignSelf: 'center', zIndex: 200 },
    // Quiet states — private and empty share the shape, not the copy.
    quiet: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingBottom: 40,
      gap: 8,
    },
    quietTitle: { fontSize: 16, fontWeight: '800', color: t.colors.fg, textAlign: 'center', marginTop: 8 },
    quietSub: { fontSize: 13.5, color: t.colors.mute, textAlign: 'center' },
  }));

  const handleFollowPress = useCallback(async () => {
    if (!id) return;
    await toggleFollow(id);
    // Counts and FRIENDS-gated payloads can change with follow state.
    void refetch();
  }, [id, toggleFollow, refetch]);

  const retryTimeline = useCallback(() => {
    setTimelineStatus('loading');
    void loadTimeline().then((ok) => setTimelineStatus(ok ? 'ready' : 'error'));
  }, [loadTimeline]);

  if (profileLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.mute} />
      </View>
    );
  }

  const stats = profile.stats;

  const topRow = (
    <View style={styles.topRow}>
      <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={24} color={tokens.colors.fg} />
      </SpringPressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        @{profile.username.toUpperCase()}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // Restricted (private / friends-only) — minimal card, follow still works.
  if (profile.restricted && !profile.isOwnProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {topRow}
        <CompactProfileHeader
          profile={profile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowPress={handleFollowPress}
        />
        <View style={styles.quiet}>
          <Ionicons name="lock-closed-outline" size={40} color={tokens.colors.muteSoft} />
          <Text style={styles.quietTitle}>This profile is private</Text>
          <Text style={styles.quietSub}>Follow to see their shows</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderQuiet = (icon: keyof typeof Ionicons.glyphMap, title: string, sub: string) => (
    <View style={styles.quiet}>
      <Ionicons name={icon} size={36} color={tokens.colors.muteSoft} />
      <Text style={styles.quietTitle}>{title}</Text>
      <Text style={styles.quietSub}>{sub}</Text>
    </View>
  );

  const renderTimeline = () => {
    if (timelineStatus === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
        </View>
      );
    }
    if (timelineStatus === 'error') {
      return (
        <View style={styles.center}>
          <ErrorState title="Couldn't load their timeline" message={timelineError ?? undefined} onRetry={retryTimeline} />
        </View>
      );
    }
    if (deckItems.length === 0) {
      // The endpoint returns [] both when showTimeline is off and when the
      // user truly has nothing — their show count tells the two apart.
      return (stats?.shows ?? 0) > 0
        ? renderQuiet('lock-closed-outline', 'Their timeline is private', 'Only they can see their shows.')
        : renderQuiet('film-outline', 'No shows yet', 'Shows they log will land here.');
    }
    return (
      <View style={styles.stage}>
        {refreshing ? (
          <View style={styles.refreshHint} pointerEvents="none">
            <ActivityIndicator size="small" color={tokens.colors.mute} />
          </View>
        ) : null}
        <MemoryDeck
          ref={deckRef}
          items={deckItems}
          initialIndex={initialDeckIndex}
          renderCard={renderCard}
          renderLabel={renderLabel}
          readoutFor={readoutFor}
          onNearEnd={() => void loadMore()}
          onOverscrollRefresh={() => void onDeckRefresh()}
        />
        {/* A tappable ticket at the bottom — jumps their wheel to today
            (the main tab's center ticket isn't here on a pushed profile). */}
        <SpringPressable
          haptic="light"
          onPress={() => {
            haptics.light();
            deckRef.current?.snapTo(initialDeckIndex, true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          style={styles.todayTicket}
        >
          <Ionicons name="ticket" size={22} color={tokens.colors.inverseFg} />
        </SpringPressable>
      </View>
    );
  };

  // MAP — the full-height venues map. The venues fetch above only decides
  // between a private map and a truly empty one (privacy empty-states).
  const renderMap = () => {
    if (venues === null) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
        </View>
      );
    }
    if (venues.length === 0) {
      return (stats?.venues ?? 0) > 0
        ? renderQuiet('lock-closed-outline', 'Their map is private', 'Only they can see their venues.')
        : renderQuiet('map-outline', 'No venues yet', 'Venues from their shows will land here.');
    }
    return (
      <View style={styles.stage}>
        <ProfileMapView
          userId={id || ''}
          onVenuePress={(venueId) => router.push({ pathname: '/venue/[venueId]', params: { venueId } })}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {topRow}

      <CompactProfileHeader
        profile={profile}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onFollowPress={handleFollowPress}
        onFriendsPress={() => setFriendsOpen(true)}
        onFollowingPress={() => setFollowingOpen(true)}
      />

      <View style={styles.segmentTrack} accessibilityRole="tablist">
        {SEGMENTS.map((opt) => {
          const active = segment === opt.value;
          return (
            <SpringPressable
              key={opt.value}
              haptic="light"
              onPress={() => {
                if (!active) setSegment(opt.value);
              }}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{opt.label}</Text>
            </SpringPressable>
          );
        })}
      </View>

      {segment === 'timeline' ? renderTimeline() : renderMap()}

      <FriendsSheet
        visible={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        userId={id || ''}
        currentUserId={user?.id}
        totalCount={stats?.following}
      />
      <FollowingSheet
        visible={followingOpen}
        onClose={() => setFollowingOpen(false)}
        userId={id || ''}
        totalCount={(stats as { followingArtists?: number } | undefined)?.followingArtists}
      />
    </SafeAreaView>
  );
}
