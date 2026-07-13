// WaterfallPostTile — a feed log as a RedNote-style masonry tile (C22).
//
// One photo per tile (no carousel — the floating viewer has the full set),
// cropped to a stable pseudo-aspect hashed from the photo/log id so the
// waterfall gets natural-ish variety without LogPhoto carrying dimensions.
// Chrome: BareScore top-right ON the photo when scored (C2; the photo-less
// stripe fallback is flat stock and carries the ScoreStamp instead), a
// bottom scrim with artist title + caption (or the trending tag in mono),
// the DegreeFacepile pinned bottom-right above the scrim text, and a tiny
// author row UNDER the photo.
//
// Interactions mirror FeedCard exactly: double-tap likes (optimistic,
// never unlikes — unlike lives on the memory screen), single tap opens the
// floating memory viewer with fast-path params. The were-here sheet stays
// OFF the tile — the viewer owns it.

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { FeedItem } from '../../types/feed';
import { getLogLikes, likeLog } from '../../lib/api/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics, motionDurations, springs } from '../../lib/motion';
import { Avatar } from '../ui/Avatar';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { BareScore, ScoreStamp, StripeField } from '../ui/Stub';

/** Feed item + the optional trending tag some payloads inline (C22). */
export type WaterfallPost = FeedItem & { trendingTag?: string };

interface WaterfallPostTileProps {
  item: WaterfallPost;
  /** Viewer id — resolves "you" + the viewer's own like state. */
  currentUserId?: string;
}

// ── Pseudo-aspect ───────────────────────────────────────────────────
// height/width ratios; the id hash keeps each tile's crop stable across
// renders, recycling, and pagination.
// Vertical-first: phone photos are portrait — tiles lean TALL (h/w), with
// the occasional square for rhythm. Bigger cards, RedNote energy.
const PSEUDO_RATIOS = [1.25, 1.35, 1.15, 1.0] as const;

export function postPseudoRatio(item: FeedItem): number {
  const id = item.log.photos?.[0]?.id ?? item.log.id;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PSEUDO_RATIOS[h % PSEUDO_RATIOS.length];
}

// Fixed chrome under the photo: author row (16px avatar + 6px padding).
const AUTHOR_ROW_HEIGHT = 24;

/** Estimated tile height at `columnWidth` — drives the masonry accounting. */
export function estimatePostTileHeight(item: FeedItem, columnWidth: number): number {
  return Math.round(columnWidth * postPseudoRatio(item)) + AUTHOR_ROW_HEIGHT;
}

const DOUBLE_TAP_MS = 260;

type LikeState = { liked: boolean; count: number };

// Module-level cache — same contract as FeedCard's: likes are not always in
// the feed payload, so each tile lazily fetches once and survives remounts.
const likeCache = new Map<string, LikeState>();

/** Call on explicit pull-to-refresh so like state refetches. */
export function invalidateWaterfallLikeCache() {
  likeCache.clear();
}

/** Compact mono age for the author row, e.g. "11H", "3D", "2W". */
function formatAge(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'NOW';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}M`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}D`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}W`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}MO`;
  return `${Math.floor(d / 365)}Y`;
}

export const WaterfallPostTile = memo(function WaterfallPostTile({
  item,
  currentUserId,
}: WaterfallPostTileProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const isSelf = Boolean(currentUserId && item.user.id === currentUserId);

  // ── Likes — the FeedCard optimistic pattern, verbatim ──
  const [like, setLike] = useState<LikeState>(
    () =>
      likeCache.get(item.log.id) ?? {
        liked: Boolean(item.likedByMe),
        count: typeof item.likeCount === 'number' ? item.likeCount : 0,
      },
  );
  const likeBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (likeCache.has(item.log.id)) {
      setLike(likeCache.get(item.log.id)!);
      return;
    }
    // The feed serializer inlines like data; use it and skip the fetch.
    if (typeof item.likeCount === 'number') {
      const next: LikeState = { liked: Boolean(item.likedByMe), count: item.likeCount };
      likeCache.set(item.log.id, next);
      setLike(next);
      return;
    }
    (async () => {
      try {
        const res = await getLogLikes(item.log.id, { limit: 50 });
        if (cancelled) return;
        const next: LikeState = {
          liked: currentUserId ? res.likes.some((l) => l.user.id === currentUserId) : false,
          count: res.likes.length,
        };
        likeCache.set(item.log.id, next);
        setLike(next);
      } catch {
        // likes stay at 0 — non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on `item` identity: pull-to-refresh replaces feed objects (and
    // clears the cache) so this refetches; re-renders reuse the cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, item]);

  const applyLike = useCallback(
    (next: LikeState) => {
      likeCache.set(item.log.id, next);
      setLike(next);
    },
    [item.log.id],
  );

  // Double-tap likes only (never unlikes — unlike lives on the memory screen).
  const likeFromDoubleTap = useCallback(async () => {
    if (like.liked) {
      haptics.medium();
      return;
    }
    if (likeBusy.current) return;
    likeBusy.current = true;
    applyLike({ liked: true, count: like.count + 1 });
    haptics.medium(); // haptics table: like = medium
    try {
      await likeLog(item.log.id);
    } catch {
      applyLike({ liked: false, count: like.count });
      haptics.error();
    } finally {
      likeBusy.current = false;
    }
  }, [applyLike, item.log.id, like]);

  // Single tap → the floating memory viewer, with fast-path params so the
  // featured card paints instantly before GET /logs/:id hydrates the rest.
  const openMemoryViewer = useCallback(() => {
    haptics.light();
    const first = item.log.photos?.[0];
    const fastPhoto = first
      ? first.mediaKind === 'video'
        ? first.thumbUrl || first.thumbnailUrl
        : first.thumbnailUrl || first.photoUrl
      : item.event.artist.imageUrl;
    const rating =
      typeof item.log.rating === 'number' && item.log.rating > 0 ? item.log.rating : null;
    router.push({
      pathname: '/memory/[logId]',
      params: {
        logId: item.log.id,
        eventId: item.event.id,
        eventName: item.event.name,
        artistName: item.event.artist.name,
        ...(fastPhoto ? { photoUrl: fastPhoto } : {}),
        ...(rating != null ? { score: String(rating) } : {}),
      },
    });
  }, [item, router]);

  // ── Tap discrimination + heart burst (FeedCardPhotos pattern) ──
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstScale = useSharedValue(0.6);
  const burstOpacity = useSharedValue(0);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const triggerBurst = useCallback(() => {
    burstScale.value = 0.6;
    burstOpacity.value = withTiming(0.95, { duration: 90 });
    burstScale.value = withSpring(1.4, springs.burst);
    burstOpacity.value = withDelay(
      motionDurations.heartBurst - 350,
      withTiming(0, { duration: 350 }),
    );
  }, [burstOpacity, burstScale]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      triggerBurst();
      void likeFromDoubleTap();
    } else {
      lastTapRef.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        openMemoryViewer();
      }, DOUBLE_TAP_MS + 30);
    }
  }, [likeFromDoubleTap, openMemoryViewer, triggerBurst]);

  // ── Media — first photo (poster frame for video), artist image fallback ──
  const first = item.log.photos?.[0];
  const photoUri = first
    ? first.mediaKind === 'video'
      ? first.thumbUrl || first.thumbnailUrl || first.photoUrl
      : first.thumbnailUrl || first.photoUrl
    : item.event.artist.imageUrl;

  const ratio = postPseudoRatio(item); // height/width; RN aspectRatio = width/height
  const score =
    typeof item.log.rating === 'number' && item.log.rating > 0 ? item.log.rating : null;
  const people = item.wasThereUsers ?? [];

  return (
    <View style={styles.tile}>
      <Pressable
        onPress={handleTap}
        style={[styles.photoBox, { aspectRatio: 1 / ratio }]}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${item.event.artist.name} — open memory. Double tap quickly to like.`}
      >
        {photoUri ? (
          <>
            <Image
              source={{ uri: photoUri }}
              style={styles.photo}
              contentFit="cover"
              transition={80}
              cachePolicy="memory-disk"
              recyclingKey={first?.id ?? item.log.id}
            />
            {/* Bottom scrim — over-photo chrome stays literal white/scrim */}
            <LinearGradient
              colors={['transparent', 'rgba(11,11,16,0.9)']}
              style={styles.scrim}
              pointerEvents="none"
            />
            {/* TOP-RIGHT: who attended (circles first), score beneath. */}
            <View style={styles.topRightOverlay} pointerEvents="none">
              {people.length > 0 ? (
                <DegreeFacepile
                  people={people}
                  size={20}
                  max={3}
                  surfaceColor="rgba(11,11,16,0.8)"
                />
              ) : null}
              {score != null ? <BareScore score={score} size={22} /> : null}
            </View>
            <View style={styles.bottomOverlay} pointerEvents="none">
              <Text style={styles.title} numberOfLines={1}>
                {item.event.artist.name}
              </Text>
              {item.trendingTag ? (
                <Text style={styles.tagLine} numberOfLines={1}>
                  {item.trendingTag}
                </Text>
              ) : item.log.note ? (
                <Text style={styles.captionLine} numberOfLines={1}>
                  {item.log.note}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          // Photo-less: flat ticket stock — stamp, never the bare score (C2).
          <View style={styles.stripeBlock}>
            <StripeField />
            <Text style={styles.stripeArtist} numberOfLines={3}>
              {item.event.artist.name}
            </Text>
            {/* TOP-RIGHT here too: circles, then the stamp. */}
            <View style={styles.topRightOverlay} pointerEvents="none">
              {people.length > 0 ? (
                <DegreeFacepile people={people} size={20} max={3} surfaceColor={c.card2} />
              ) : null}
              {score != null ? <ScoreStamp score={score} size={12} /> : null}
            </View>
          </View>
        )}

        {/* Heart burst — hearts are always tokens.colors.like */}
        <Animated.View style={[styles.burst, burstStyle]} pointerEvents="none">
          <Ionicons name="heart" size={56} color={c.like} />
        </Animated.View>
      </Pressable>

      {/* Author row — under the photo */}
      <View style={styles.authorRow}>
        <Avatar
          uri={item.user.avatarUrl}
          name={item.user.displayName || item.user.username}
          size={16}
        />
        <Text style={styles.authorName} numberOfLines={1}>
          {isSelf ? 'you' : item.user.username}
        </Text>
        <Text style={styles.authorAge}>{formatAge(item.createdAt)}</Text>
      </View>
    </View>
  );
});

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    tile: {
      width: '100%',
    },
    photoBox: {
      width: '100%',
      borderRadius: tokens.radius.card,
      overflow: 'hidden',
      backgroundColor: tokens.colors.card2,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '46%',
    },
    topRightOverlay: {
      position: 'absolute',
      top: 8,
      right: 10,
      alignItems: 'flex-end',
      gap: 6,
    },
    bottomOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 10,
      paddingBottom: 9,
    },

    title: {
      fontSize: 13.5,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: '#FFFFFF',
    },
    captionLine: {
      fontSize: 11.5,
      lineHeight: 15,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    tagLine: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.4,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 3,
    },

    /* Photo-less media — flat ticket stock (card2 + stripes). */
    stripeBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor: tokens.colors.card2,
    },
    stripeArtist: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.3,
      textAlign: 'center',
      color: tokens.colors.fg,
    },

    burst: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Author row — under the photo (AUTHOR_ROW_HEIGHT tracks this). */
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingTop: 6,
      paddingHorizontal: 2,
      height: AUTHOR_ROW_HEIGHT,
    },
    authorName: {
      flexShrink: 1,
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.2,
      color: tokens.colors.mute,
    },
    authorAge: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.2,
      color: tokens.colors.muteSoft,
    },
  });
