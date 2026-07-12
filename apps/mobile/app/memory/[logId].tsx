// Floating memory viewer — app/memory/[logId].tsx
//
// The tap-in experience from the feed: registered as a TRANSPARENT MODAL
// (root _layout: presentation 'transparentModal', fade) so the underlying
// screen barely ghosts through a 96% theme-bg backdrop. The tapped memory
// floats front and center as the full photo-first card (FeedCard v3 anatomy,
// reusing FeedCardPhotos + the same over-photo chrome via MemoryFloatCard),
// and beneath it a snap-scrolling horizontal rail pages through everyone
// else's public memories from the SAME show (GET /events/:id/feed).
//
// Fast-path params contract (all strings; logId is the path param):
//   { logId, eventId?, eventName?, artistName?, photoUrl?, score? }
// The card paints instantly from these, then hydrates via GET /logs/:id.
// Tapping a rail card swaps it into the featured slot (crossfade + spring,
// no navigation); the old featured card is prepended back into the rail.
// Dismiss: tap outside or swipe the card down. "OPEN MEMORY →" pushes the
// full /log/[id] screen for comments/likers/actions.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FeedItem, FeedPhoto } from '../../types/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics, motionDurations, springs } from '../../lib/motion';
import { getLogDetail, getLogLikes, likeLog } from '../../lib/api/feed';
import { getEventFeed } from '../../lib/api/events';
import { useSession } from '../../hooks/useSession';
import {
  MemoryFloatCard,
  feedItemToMemoryCard,
  type MemoryCardData,
} from '../../components/memory/MemoryFloatCard';
import {
  MemoryRailCard,
  RAIL_CARD_GAP,
  RAIL_CARD_HEIGHT,
  RAIL_CARD_WIDTH,
} from '../../components/memory/MemoryRailCard';
import { WereHereSheet } from '../../components/feed/WereHereSheet';

const RAIL_PAGE = 12;
const RAIL_SNAP = RAIL_CARD_WIDTH + RAIL_CARD_GAP;
// Swipe-down dismiss thresholds (distance px / velocity).
const DISMISS_DY = 120;
const DISMISS_VY = 0.8;

type LikeState = { liked: boolean; count: number };

type ViewerParams = {
  logId: string;
  eventId?: string;
  eventName?: string;
  artistName?: string;
  photoUrl?: string;
  score?: string;
};

/** "#RRGGBB" + alpha → rgba() (backdrop = theme bg at 96%). */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export default function MemoryViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ViewerParams>();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);
  const { user } = useSession();
  const currentUserId = user?.id;

  const logId = params.logId ?? '';

  // ── Featured card: fast-path paint → hydrate → rail swaps ──
  const [featured, setFeatured] = useState<MemoryCardData>(() => {
    const fastScore = params.score ? Number(params.score) : NaN;
    const photos: FeedPhoto[] = params.photoUrl
      ? [{ id: `fast-${logId}`, photoUrl: params.photoUrl }]
      : [];
    return {
      logId,
      eventId: params.eventId,
      eventName: params.eventName,
      artistName: params.artistName,
      score: Number.isFinite(fastScore) && fastScore > 0 ? fastScore : null,
      photos,
    };
  });
  // Full feed-shaped item for the CURRENT featured card (hydration or rail
  // swap) — what gets prepended back into the rail on the next swap.
  const [featuredItem, setFeaturedItem] = useState<FeedItem | null>(null);

  const featuredIdRef = useRef(featured.logId);
  useEffect(() => {
    featuredIdRef.current = featured.logId;
  }, [featured.logId]);
  const featuredItemRef = useRef<FeedItem | null>(null);
  useEffect(() => {
    featuredItemRef.current = featuredItem;
  }, [featuredItem]);

  // Hydrate the tapped memory (GET /logs/:id) — fills author pill, caption,
  // full photo set, counts. Skipped silently if a rail swap got there first.
  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await getLogDetail(logId);
        if (cancelled) return;
        const hydrated = feedItemToMemoryCard(detail);
        setFeatured((prev) =>
          prev.logId === hydrated.logId
            ? { ...hydrated, photos: hydrated.photos.length ? hydrated.photos : prev.photos }
            : prev,
        );
        setFeaturedItem((prev) => prev ?? detail);
      } catch {
        // fast-path card stays up — non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logId]);

  // ── Likes for the featured card (meta line + double-tap) ──
  const [like, setLike] = useState<LikeState | null>(null);
  const likeBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof featured.likeCount === 'number') {
      setLike({ liked: Boolean(featured.likedByMe), count: featured.likeCount });
      return;
    }
    setLike(null);
    if (!featured.logId) return;
    (async () => {
      try {
        const res = await getLogLikes(featured.logId, { limit: 50 });
        if (cancelled) return;
        setLike({
          liked: currentUserId ? res.likes.some((l) => l.user.id === currentUserId) : false,
          count: res.likes.length,
        });
      } catch {
        // likes stay hidden — non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, featured.likeCount, featured.likedByMe, featured.logId]);

  // Double-tap likes only (never unlikes — mirrors FeedCard v3).
  const handleDoubleTapLike = useCallback(async () => {
    if (like?.liked) {
      haptics.medium();
      return;
    }
    if (likeBusy.current) return;
    likeBusy.current = true;
    const prev = like ?? { liked: false, count: 0 };
    setLike({ liked: true, count: prev.count + 1 });
    haptics.medium(); // haptics table: like = medium
    try {
      await likeLog(featured.logId);
    } catch {
      setLike(prev);
      haptics.error();
    } finally {
      likeBusy.current = false;
    }
  }, [featured.logId, like]);

  // ── The rail: everyone else's public memories from the same show ──
  const [rail, setRail] = useState<FeedItem[]>([]);
  const [railCursor, setRailCursor] = useState<string | null>(null);
  const [railBusy, setRailBusy] = useState(false);
  const [railMore, setRailMore] = useState(false);
  const [railLoaded, setRailLoaded] = useState(false);
  const railFetchedFor = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const railRef = useRef<FlatList<FeedItem>>(null);
  const lastSnapIndex = useRef(0);

  const eventId = featured.eventId;

  useEffect(() => {
    if (!eventId || railFetchedFor.current === eventId) return;
    railFetchedFor.current = eventId;
    let cancelled = false;
    (async () => {
      setRailBusy(true);
      try {
        const res = await getEventFeed(eventId, { limit: RAIL_PAGE });
        if (cancelled) return;
        setRail(res.items.filter((i) => i.log.id !== featuredIdRef.current));
        setRailCursor(res.nextCursor ?? null);
      } catch {
        // quiet rail — non-fatal
      } finally {
        if (!cancelled) {
          setRailBusy(false);
          setRailLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const loadMore = useCallback(async () => {
    if (!eventId || !railCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setRailMore(true);
    try {
      const res = await getEventFeed(eventId, { limit: RAIL_PAGE, cursor: railCursor });
      setRail((prev) => {
        const seen = new Set(prev.map((i) => i.log.id));
        seen.add(featuredIdRef.current);
        return [...prev, ...res.items.filter((i) => !seen.has(i.log.id))];
      });
      setRailCursor(res.nextCursor ?? null);
    } catch {
      // keep current pages
    } finally {
      loadingMoreRef.current = false;
      setRailMore(false);
    }
  }, [eventId, railCursor]);

  const onRailMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.round(e.nativeEvent.contentOffset.x / RAIL_SNAP));
    if (i !== lastSnapIndex.current) {
      lastSnapIndex.current = i;
      haptics.light(); // carousel snap
    }
  }, []);

  // ── Motion: entrance spring, swap crossfade, drag-to-dismiss ──
  const enterScale = useSharedValue(0.94);
  const enterY = useSharedValue(12);
  const enterOpacity = useSharedValue(0);
  const swapScale = useSharedValue(1);
  const swapOpacity = useSharedValue(1);
  const dragY = useSharedValue(0);

  useEffect(() => {
    // Entrance: spring scale 0.94→1 + translateY 12→0, medium haptic on open.
    haptics.medium();
    enterOpacity.value = withTiming(1, { duration: motionDurations.crossfade });
    enterScale.value = withSpring(1, springs.sheet);
    enterY.value = withSpring(0, springs.sheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value * swapOpacity.value,
    transform: [
      { translateY: enterY.value + dragY.value },
      { scale: enterScale.value * swapScale.value },
    ],
  }));

  const metaStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value * swapOpacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, 260], [1, 0.4], Extrapolation.CLAMP),
  }));

  const close = useCallback(() => {
    haptics.light();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }, [router]);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  // Swipe-down dismiss — the card follows the finger; past the threshold the
  // modal fades out (screen-level fade), otherwise it springs back.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
      onPanResponderMove: (_e, g) => {
        dragY.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DY || g.vy > DISMISS_VY) {
          closeRef.current();
        } else {
          dragY.value = withSpring(0, springs.gentle);
        }
      },
      onPanResponderTerminate: () => {
        dragY.value = withSpring(0, springs.gentle);
      },
    }),
  ).current;

  // ── Swap: tapped rail card becomes the featured card (no navigation) ──
  const applySwap = useCallback(
    (next: FeedItem) => {
      const prevItem = featuredItemRef.current;
      setRail((prev) => {
        const rest = prev.filter((i) => i.log.id !== next.log.id);
        // Prepend the outgoing featured card back into the rail.
        return prevItem && prevItem.log.id !== next.log.id ? [prevItem, ...rest] : rest;
      });
      setFeaturedItem(next);
      setFeatured(feedItemToMemoryCard(next));
      lastSnapIndex.current = 0;
      railRef.current?.scrollToOffset({ offset: 0, animated: false });
      swapScale.value = withSpring(1, springs.gentle);
      swapOpacity.value = withTiming(1, { duration: motionDurations.crossfade });
    },
    [swapOpacity, swapScale],
  );

  const swapTo = useCallback(
    (next: FeedItem) => {
      haptics.light();
      swapScale.value = withTiming(0.96, { duration: motionDurations.crossfade });
      swapOpacity.value = withTiming(0, { duration: motionDurations.crossfade }, (finished) => {
        if (finished) runOnJS(applySwap)(next);
      });
    },
    [applySwap, swapOpacity, swapScale],
  );

  // ── Navigation out ──
  const openFullMemory = useCallback(() => {
    haptics.light();
    router.push({ pathname: '/log/[id]', params: { id: featured.logId } });
  }, [featured.logId, router]);

  const [wereHereOpen, setWereHereOpen] = useState(false);
  const openWereHere = useCallback(() => {
    haptics.light();
    setWereHereOpen(true);
  }, []);

  // ── Layout: size the card so card + meta + rail fit the viewport ──
  const cardW = Math.round(winW * 0.92);
  const railPad = Math.max(0, Math.round((winW - cardW) / 2));
  const railBlockH = RAIL_CARD_HEIGHT + 38; // eyebrow + gap
  const availableH = winH - insets.top - insets.bottom - railBlockH - 34 - 40;
  const cardAspect = Math.min(1.2, Math.max(0.85, availableH / cardW));

  const commentCount = featured.commentCount ?? 0;
  const railTitle = (featured.eventName || featured.artistName || 'THIS SHOW').toUpperCase();

  const renderRailItem = useCallback(
    ({ item }: { item: FeedItem }) => <MemoryRailCard item={item} onPress={swapTo} />,
    [swapTo],
  );

  return (
    <View style={styles.root}>
      {/* Backdrop: theme bg at 96% — the underlying screen barely ghosts through */}
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close memory viewer"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* ── The floating card ── */}
        <View style={styles.centerArea} pointerEvents="box-none">
          <Animated.View
            style={[styles.cardWrap, { width: cardW }, cardStyle]}
            {...pan.panHandlers}
          >
            <MemoryFloatCard
              data={featured}
              aspectRatio={cardAspect}
              currentUserId={currentUserId}
              onPressMedia={openFullMemory}
              onDoubleTapLike={() => void handleDoubleTapLike()}
              onPressFacepile={openWereHere}
            />
          </Animated.View>

          {/* Quiet mono meta line — counts left, "OPEN MEMORY →" right */}
          <Animated.View style={[styles.metaRow, { width: cardW }, metaStyle]}>
            <View style={styles.metaLeft}>
              {like && like.count > 0 ? (
                <>
                  <Ionicons name="heart" size={11} color={c.like} style={styles.heartGlyph} />
                  <Text style={styles.metaText}>{like.count}</Text>
                </>
              ) : null}
              {like && like.count > 0 && commentCount > 0 ? (
                <Text style={styles.metaDot}>·</Text>
              ) : null}
              {commentCount > 0 ? (
                <Text style={styles.metaText}>
                  {commentCount} {commentCount === 1 ? 'COMMENT' : 'COMMENTS'}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={openFullMemory}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open full memory"
            >
              <Text style={styles.metaAction}>OPEN MEMORY →</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── More from this show ── */}
        <View style={styles.railBlock} pointerEvents="box-none">
          <Text style={[styles.eyebrow, { marginLeft: railPad }]} numberOfLines={1}>
            MORE FROM {railTitle}
          </Text>

          {rail.length > 0 ? (
            <FlatList
              ref={railRef}
              data={rail}
              keyExtractor={(i) => i.log.id}
              renderItem={renderRailItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={RAIL_SNAP}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: railPad, gap: RAIL_CARD_GAP }}
              onMomentumScrollEnd={onRailMomentumEnd}
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={0.6}
              initialNumToRender={3}
              maxToRenderPerBatch={4}
              windowSize={5}
              ListFooterComponent={
                railMore ? (
                  <View style={styles.railFooter}>
                    <ActivityIndicator size="small" color={c.mute} />
                  </View>
                ) : null
              }
            />
          ) : railLoaded && !railBusy ? (
            <View style={styles.railEmpty}>
              <Text style={styles.railEmptyText}>First public memory from this show.</Text>
            </View>
          ) : (
            <View style={styles.railEmpty}>
              <ActivityIndicator size="small" color={c.mute} />
            </View>
          )}
        </View>
      </SafeAreaView>

      <WereHereSheet
        visible={wereHereOpen}
        onClose={() => setWereHereOpen(false)}
        logId={featured.logId}
        currentUserId={currentUserId}
        totalCount={featured.wasThereCount ?? 0}
      />
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(tokens.colors.bg, 0.96),
    },
    safe: {
      flex: 1,
    },
    centerArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardWrap: {
      borderRadius: 22,
      backgroundColor: tokens.colors.card,
      ...tokens.shadows.elevated,
    },

    /* Quiet mono meta line (FeedCard v3 treatment) */
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingTop: 10,
      minHeight: 16,
    },
    metaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heartGlyph: {
      marginRight: 4,
    },
    metaText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: tokens.colors.mute,
    },
    metaDot: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      color: tokens.colors.mute,
      marginHorizontal: 5,
    },
    metaAction: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: tokens.colors.textSoft,
    },

    /* Rail */
    railBlock: {
      paddingBottom: 8,
    },
    eyebrow: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
      marginBottom: 10,
      marginRight: 20,
    },
    railFooter: {
      width: 60,
      height: RAIL_CARD_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    railEmpty: {
      height: RAIL_CARD_HEIGHT,
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    railEmptyText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: tokens.colors.muteSoft,
    },
  });
