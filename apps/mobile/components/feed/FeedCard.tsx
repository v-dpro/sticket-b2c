// FeedCard v3 — "the post is the photo" (Phase A, decision A21).
//
// De-Instagrammed feed card: the show photo carousel IS the card. A blurred
// author pill (top-left), a mono score chip (top-right), the artist /
// venue·date / caption stacked over a bottom scrim, and a who-also-went
// facepile (bottom-right, when the serializer inlines wasThereUsers) ride
// directly on the media. Below the card sits ONE quiet mono meta line —
// likes + comments (with the only red in the card, the heart glyph),
// left-aligned; the facepile carries who-went.
//
// Everything the old card carried on-surface (action-button row, liked-by
// avatars, link chips, comments preview, pinned composer, who-was-here) now
// lives on the memory screen (/log/[id]). Interactions collapse to three:
//   · double-tap anywhere on the media → like (heart burst + haptic)
//   · single tap on the media → the floating memory viewer (/memory/[logId],
//     fast-path params for instant paint)
//   · tap the facepile → "Were here" sheet
// Long-press does nothing.

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { LinearTransition } from 'react-native-reanimated';

import type { FeedItem, FeedPhoto } from '../../types/feed';
import { getLogLikes, likeLog } from '../../lib/api/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics, motionDurations } from '../../lib/motion';
import { Avatar } from '../ui/Avatar';
import { FeedCardPhotos } from './FeedCardPhotos';
import { WereHereFacepile } from './WereHereFacepile';
import { WereHereSheet } from './WereHereSheet';

interface FeedCardProps {
  item: FeedItem;
  /** Viewer id — resolves "you" + the viewer's own like state. */
  currentUserId?: string;
}

type LikeState = { liked: boolean; count: number };

// Module-level cache — likes are not always in the feed payload, so each card
// lazily fetches once and survives FlatList recycling.
const likeCache = new Map<string, LikeState>();

/** Call on explicit pull-to-refresh so like counts refetch. */
export function invalidateFeedLikeCache() {
  likeCache.clear();
}

// height ≈ 300 at 340pt width. FeedCardPhotos.aspectRatio is height/width;
// the fallback tile uses RN's width/height aspectRatio (its reciprocal).
const MEDIA_ASPECT = 300 / 340;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Compact mono age for the author pill, e.g. "11H", "3D", "2W". */
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

/** Log ratings are stored on a 1–10 scale (see log/details.tsx). */
function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Memoized: props are `item` (replaced by identity on refresh) and
// `currentUserId` (string), so the default shallow compare is correct —
// parent list re-renders (scroll/pagination state) skip unchanged cards.
export const FeedCard = memo(function FeedCard({ item, currentUserId }: FeedCardProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  // Self-post treatment: this is the viewer's own logged show.
  const isSelf = Boolean(currentUserId && item.user.id === currentUserId);

  // ── Likes ──
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
      // Already liked — the burst replays in FeedCardPhotos; just a tap of feel.
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

  // Who-also-went sheet, opened from the over-photo facepile.
  const [wereHereOpen, setWereHereOpen] = useState(false);
  const openWereHere = useCallback(() => {
    haptics.light();
    setWereHereOpen(true);
  }, []);

  // ── Media ──
  const photos: FeedPhoto[] = item.log.photos?.length
    ? item.log.photos
    : item.event.artist.imageUrl
      ? [{ id: `artist-${item.event.artist.id}`, photoUrl: item.event.artist.imageUrl }]
      : [];

  const score =
    typeof item.log.rating === 'number' && item.log.rating > 0 ? item.log.rating : null;

  // Over-photo chrome — painted on the media by FeedCardPhotos (card variant).
  const overlay = (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.overlayTop} pointerEvents="box-none">
        {/* Solid pill (same treatment as the score chip) — per-card BlurView is a scroll-perf trap. */}
        <View style={styles.authorPill}>
          <Avatar uri={item.user.avatarUrl} name={item.user.displayName || item.user.username} size={20} />
          <Text style={styles.authorName} numberOfLines={1}>
            {isSelf ? 'you' : item.user.username}
          </Text>
          <Text style={styles.authorAge}>{formatAge(item.createdAt)}</Text>
        </View>
        {score != null ? (
          <View style={styles.scoreChip}>
            <Text style={styles.scoreText}>{formatScore(score)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.overlayBottom} pointerEvents="box-none">
        <View style={styles.overlayBottomText} pointerEvents="box-none">
          <Text style={styles.artistName} numberOfLines={2}>
            {item.event.artist.name}
          </Text>
          <Text style={styles.venueDate} numberOfLines={1}>
            {`${item.event.venue.name} · ${formatDate(item.event.date)}`}
          </Text>
          {item.log.note ? (
            <Text style={styles.caption} numberOfLines={2}>
              {item.log.note}
            </Text>
          ) : null}
        </View>
        {/* Who-also-went facepile — only when the serializer inlined users */}
        {item.wasThereUsers && item.wasThereUsers.length > 0 ? (
          <WereHereFacepile
            users={item.wasThereUsers}
            totalCount={item.wasThereCount}
            onPress={openWereHere}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <Animated.View layout={LinearTransition.duration(motionDurations.expand)} style={styles.wrapper}>
      {photos.length > 0 ? (
        <FeedCardPhotos
          photos={photos}
          aspectRatio={MEDIA_ASPECT}
          dotsPosition="right"
          showCounter={false}
          scrims
          radius={22}
          overlay={overlay}
          onPressMedia={openMemoryViewer}
          onDoubleTapLike={() => void likeFromDoubleTap()}
        />
      ) : (
        <Pressable
          style={styles.fallback}
          onPress={openMemoryViewer}
          accessibilityRole="button"
          accessibilityLabel="Open memory"
        >
          <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.28)" />
          <View style={styles.fallbackScrim} pointerEvents="none" />
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {overlay}
          </View>
        </Pressable>
      )}

      {/* ── Quiet mono meta line — counts only; the facepile carries who-went ── */}
      <View style={styles.metaRow}>
        {like.count > 0 ? (
          <>
            <Ionicons name="heart" size={11} color={c.error} style={styles.heartGlyph} />
            <Text style={styles.metaText}>{like.count}</Text>
          </>
        ) : null}
        {like.count > 0 && item.commentCount > 0 ? <Text style={styles.metaDot}>·</Text> : null}
        {item.commentCount > 0 ? (
          <Text style={styles.metaText}>
            {item.commentCount} {item.commentCount === 1 ? 'COMMENT' : 'COMMENTS'}
          </Text>
        ) : null}
      </View>

      <WereHereSheet
        visible={wereHereOpen}
        onClose={() => setWereHereOpen(false)}
        logId={item.log.id}
        currentUserId={currentUserId}
        totalCount={item.wasThereCount}
      />
    </Animated.View>
  );
});

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    wrapper: {
      marginHorizontal: 20,
    },

    /* No-media fallback — fixed dark tile so the white chrome stays legible. */
    fallback: {
      width: '100%',
      aspectRatio: 1 / MEDIA_ASPECT,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: '#17171E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(11,11,16,0.35)',
    },

    /* Over-photo overlay */
    overlay: {
      flex: 1,
      padding: 14,
      justifyContent: 'space-between',
    },
    overlayTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    authorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingLeft: 4,
      paddingRight: 11,
      paddingVertical: 4,
      borderRadius: tokens.radius.full,
      overflow: 'hidden',
      backgroundColor: 'rgba(11,11,16,0.55)',
    },
    authorName: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    authorAge: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.4,
      color: 'rgba(255,255,255,0.6)',
    },
    scoreChip: {
      minWidth: 30,
      paddingHorizontal: 8,
      height: 26,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      backgroundColor: 'rgba(11,11,16,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreText: {
      fontFamily: tokens.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      color: '#FFFFFF',
    },
    overlayBottom: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    overlayBottomText: {
      flex: 1,
      alignItems: 'flex-start',
    },
    artistName: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      lineHeight: 26,
      color: '#FFFFFF',
    },
    venueDate: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.82)',
      marginTop: 5,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 7,
    },

    /* Quiet mono meta line */
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingTop: 9,
      minHeight: 16,
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
  });
