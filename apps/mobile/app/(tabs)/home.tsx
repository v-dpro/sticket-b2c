// Home — the friends feed as a RedNote-style WATERFALL (C22).
//
// Header (wordmark + scope toggle + notifications) and the feed data flow
// are unchanged; the body is the 2-column Waterfall masonry: crowd post
// tiles from useFeed, with compact discovery tiles (explore payload,
// best-effort) woven in every 5-6 posts. Waterfall's column accounting
// keeps entity tiles alternating and never adjacent.

import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { haptics } from '../../lib/motion';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgendaPin } from '../../components/agenda/AgendaPin';
import { EmptyFeed } from '../../components/feed/EmptyFeed';
import { invalidateFeedLikeCache } from '../../components/feed/FeedCard';
import { FeedScopeToggle } from '../../components/feed/FeedScopeToggle';
import { FindPeopleCard } from '../../components/feed/FindPeopleCard';
import { Waterfall, WaterfallSkeleton, type WaterfallSlot } from '../../components/feed/Waterfall';
import {
  WaterfallEntityTile,
  entityKey,
  estimateEntityTileHeight,
  type WaterfallEntity,
} from '../../components/feed/WaterfallEntityTile';
import {
  WaterfallPostTile,
  estimatePostTileHeight,
  invalidateWaterfallLikeCache,
  type WaterfallPost,
} from '../../components/feed/WaterfallPostTile';
import { invalidateWhoWasHereCache } from '../../components/feed/WhoWasHere';
import { NotificationBellButton } from '../../components/notifications/NotificationBellButton';
import { PillButton } from '../../components/ui/PillButton';
import { useFeed } from '../../hooks/useFeed';
import { useSession } from '../../hooks/useSession';
import { getExplore, type ExploreData } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export default function HomeScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
    },
    wordmark: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: t.colors.fg,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    scopeCaption: {
      paddingHorizontal: t.density.pad,
      paddingBottom: 8,
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.2,
      color: t.colors.mute,
    },
    footer: { paddingVertical: 20 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: t.density.gap,
    },
    stateTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: t.colors.fg,
      textAlign: 'center',
    },
    stateBody: {
      fontSize: 14,
      color: t.colors.textSoft,
      textAlign: 'center',
      lineHeight: 20,
    },
    stateActions: { gap: 10, marginTop: 6, alignSelf: 'stretch' },
  }));

  const { user } = useSession();
  const {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    hasNoFriends,
    error,
    requiresAuth,
    scope,
    setScope,
    refresh,
    loadMore,
  } = useFeed();

  // Discovery tiles — best-effort: a failed /explore just means a
  // posts-only waterfall.
  const [explore, setExplore] = useState<ExploreData | null>(null);
  // IG/RedNote re-tap: tapping the Feed tab while already on it scrolls
  // to the top and pulls fresh posts.
  // Minimal structural type — RN 0.81's PublicScrollViewInstance isn't
  // exported through the package surface; scrollTo is all we use.
  const feedScrollRef = useRef<{ scrollTo(o: { y: number; animated?: boolean }): void } | null>(
    null,
  );
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const retapRef = useRef<() => void>(() => {});
  useEffect(() => {
    return navigation.addListener('tabPress' as never, () => {
      if (isFocusedRef.current) retapRef.current();
    });
  }, [navigation]);

  // Each refresh re-seeds the discovery weave — posts stay chronological,
  // but the woven entity tiles reshuffle so a reload FEELS fresh (RedNote).
  const [weaveNonce, setWeaveNonce] = useState(0);
  // Swipe left/right anywhere on the feed to walk PUBLIC ↔ FRIENDS ↔
  // FRIENDS+ (default FRIENDS in the middle).
  const SCOPE_ORDER = useMemo(() => ['public', 'friends', 'fof'] as const, []);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const scopeSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-28, 28])
        .failOffsetY([-16, 16])
        .onFinalize((e, success) => {
          if (!success || Math.abs(e.translationX) < 48) return;
          const idx = SCOPE_ORDER.indexOf(scopeRef.current);
          const next = e.translationX < 0 ? Math.min(idx + 1, 2) : Math.max(idx - 1, 0);
          if (next !== idx) {
            haptics.light();
            setScope(SCOPE_ORDER[next]!);
          }
        })
        .runOnJS(true),
    [SCOPE_ORDER, setScope],
  );

  const fullRefresh = useCallback(() => {
    invalidateWaterfallLikeCache();
    invalidateFeedLikeCache();
    invalidateWhoWasHereCache();
    fetchExploreRef.current();
    setWeaveNonce((n) => n + 1);
    void refresh();
  }, [refresh]);
  retapRef.current = () => {
    feedScrollRef.current?.scrollTo({ y: 0, animated: true });
    fullRefresh();
  };

  const fetchExploreRef = useRef<() => void>(() => {});
  const fetchExplore = useCallback(() => {
    getExplore()
      .then(setExplore)
      .catch(() => {
        // best-effort — skip entity tiles
      });
  }, []);
  fetchExploreRef.current = fetchExplore;
  useEffect(() => {
    fetchExplore();
  }, [fetchExplore]);

  // Refresh when the tab regains focus (e.g. right after sign-in).
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        void refreshRef.current();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  // ── The weave ──
  // Round-robin the explore sections into one entity pool, then insert one
  // entity tile per 5-6 posts (alternating cadence). Waterfall's column
  // accounting handles alternation + never-adjacent placement.
  const slots = useMemo<WaterfallSlot[]>(() => {
    const entities: WaterfallEntity[] = [];
    if (explore) {
      const sources: WaterfallEntity[][] = [
        explore.trendingEvents.map((data) => ({ kind: 'event' as const, data })),
        explore.risingArtists.map((data) => ({ kind: 'artist' as const, data })),
        explore.venues.map((data) => ({ kind: 'venue' as const, data })),
        explore.spotlightTours.map((data) => ({ kind: 'tour' as const, data })),
      ];
      for (let i = 0; sources.some((s) => i < s.length); i++) {
        for (const s of sources) if (i < s.length) entities.push(s[i]);
      }
      // Seeded shuffle per refresh — same session, new mix.
      let seed = weaveNonce * 2654435761 + 1;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      if (weaveNonce > 0) {
        for (let i = entities.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [entities[i], entities[j]] = [entities[j]!, entities[i]!];
        }
      }
    }

    const out: WaterfallSlot[] = [];
    let entityIdx = 0;
    let sincePost = 0; // posts since the last entity tile
    let cadence = 5; // ONE entity per 5-6 crowd tiles
    for (const raw of items) {
      const item = raw as WaterfallPost;
      out.push({
        key: item.id,
        kind: 'post',
        estimateHeight: (w) => estimatePostTileHeight(item, w),
        render: () => <WaterfallPostTile item={item} currentUserId={user?.id} />,
      });
      sincePost += 1;
      if (sincePost >= cadence && entityIdx < entities.length) {
        const entity = entities[entityIdx++];
        out.push({
          key: entityKey(entity),
          kind: 'entity',
          estimateHeight: estimateEntityTileHeight,
          render: () => <WaterfallEntityTile entity={entity} />,
        });
        sincePost = 0;
        cadence = cadence === 5 ? 6 : 5;
      }
    }
    return out;
  }, [explore, items, user?.id, weaveNonce]);

  const needsSignIn = Boolean(
    (!user && requiresAuth) || error?.includes('online account') || error?.includes('session expired')
  );

  let body: React.ReactNode;
  if (loading && items.length === 0) {
    body = <WaterfallSkeleton />;
  } else if (items.length === 0 && (error || (requiresAuth && !user))) {
    body = (
      <View style={styles.center}>
        <Ionicons
          name={needsSignIn ? 'lock-closed-outline' : 'cloud-offline-outline'}
          size={40}
          color={tokens.colors.muteSoft}
        />
        <Text style={styles.stateTitle}>
          {needsSignIn ? 'Sign in to see your feed' : "Couldn't load your feed"}
        </Text>
        <Text style={styles.stateBody}>
          {needsSignIn
            ? 'Your friends’ shows live here.'
            : error ?? 'Something went wrong. Give it another shot.'}
        </Text>
        <View style={styles.stateActions}>
          {needsSignIn ? (
            <PillButton
              title="Sign in"
              size="lg"
              springFeedback
              haptic="light"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          ) : (
            <PillButton title="Try again" size="lg" springFeedback haptic="light" onPress={() => void refresh()} />
          )}
          <PillButton
            title="Explore shows"
            variant="ghost"
            size="lg"
            springFeedback
            onPress={() => router.replace('/(tabs)/explore')}
          />
        </View>
      </View>
    );
  } else if (items.length === 0) {
    body = <EmptyFeed hasNoFriends={Boolean(hasNoFriends)} />;
  } else {
    body = (
      <Waterfall
        slots={slots}
        scrollRef={feedScrollRef as React.ComponentProps<typeof ScrollView>['ref']}
        header={hasNoFriends ? <FindPeopleCard /> : null}
        footer={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fullRefresh}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>sticket</Text>
        <View style={styles.headerRight}>
          <FeedScopeToggle scope={scope} onChange={setScope} />
          <NotificationBellButton color={tokens.colors.fg} />
        </View>
      </View>
      {scope === 'fof' ? (
        <Text style={styles.scopeCaption}>Including friends of friends’ public posts</Text>
      ) : null}
      {/* A6/A10 — pinned agenda card (TONIGHT beats LAST NIGHT), above the feed. */}
      <AgendaPin />
      <GestureDetector gesture={scopeSwipe}>
        <View style={{ flex: 1 }} collapsable={false}>
          {body}
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}
