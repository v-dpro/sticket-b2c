// FeedCard v2 — the ShowCard (SCREENS.md §1, INTERACTIONS.md "Feed — ShowCard").
// Full-bleed IG-style post: header → media carousel → action row (likes) →
// liked-by line → caption (artist 800 + score chip) → who-was-here
// expandable → links row → comments → pinned composer.
//
// "Encore, muted" restyle: fully tokenized via useTheme(); monochrome
// actions (heart fills semantic error-red when liked); weight-led system
// type with mono reserved for numbers/dates/labels. Interactions (heart
// pop, double-tap burst, carousel snap) are preserved verbatim.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';

import type { FeedComment, FeedItem, FeedPhoto } from '../../types/feed';
import {
  getLogComments,
  getLogLikes,
  likeLog,
  unlikeLog,
  type LogLikeUser,
} from '../../lib/api/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics, motionDurations, springs } from '../../lib/motion';
import { Avatar } from '../ui/Avatar';
import { AvatarStack } from '../ui/AvatarStack';
import { SpringNumber } from '../ui/SpringNumber';
import { SpringPressable } from '../ui/SpringPressable';
import { FeedCardPhotos } from './FeedCardPhotos';
import { PinnedComposer, type PinnedComposerHandle } from './PinnedComposer';
import { WhoWasHere } from './WhoWasHere';

interface FeedCardProps {
  item: FeedItem;
  /** Viewer id — used to resolve "you liked this". */
  currentUserId?: string;
  /** Viewer avatar/name for the pinned composer. */
  viewerAvatarUrl?: string | null;
  viewerName?: string | null;
  onComment: (logId: string, text: string) => Promise<FeedComment | null>;
  onCommentAdded: (logId: string, comment: FeedComment) => void;
}

type LikeState = {
  liked: boolean;
  count: number;
  likers: LogLikeUser[];
  hasMore: boolean;
};

// Module-level cache — likes are not in the feed payload, so each card
// lazily fetches once and survives FlatList recycling.
const likeCache = new Map<string, LikeState>();

/** Call on explicit pull-to-refresh so like counts refetch. */
export function invalidateFeedLikeCache() {
  likeCache.clear();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function relTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

/** Log ratings are stored on a 1–10 scale (see log/details.tsx). */
function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function FeedCard({
  item,
  currentUserId,
  viewerAvatarUrl,
  viewerName,
  onComment,
  onCommentAdded,
}: FeedCardProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);
  const composerRef = useRef<PinnedComposerHandle>(null);

  // ── Likes ──
  const [like, setLike] = useState<LikeState>(
    () => likeCache.get(item.log.id) ?? { liked: false, count: 0, likers: [], hasMore: false },
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
      const next: LikeState = {
        liked: Boolean(item.likedByMe),
        count: item.likeCount,
        likers: item.recentLikers ?? [],
        hasMore: item.likeCount > (item.recentLikers?.length ?? 0),
      };
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
          likers: res.likes.map((l) => l.user),
          hasMore: Boolean(res.nextCursor),
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
    // Keyed on `item` identity: a pull-to-refresh replaces feed objects
    // (and clears the cache), which re-runs this fetch; re-renders and
    // pagination reuse the same objects and hit the cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, item]);

  // Heart pop: 1 → 1.35 → 1 over ~240ms; red flash fades in/out 200ms.
  const heartScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const popHeart = useCallback(() => {
    heartScale.value = withSequence(
      withTiming(1.35, { duration: motionDurations.heartPop / 2 }),
      withSpring(1, springs.press),
    );
    flashOpacity.value = withSequence(
      withTiming(0.35, { duration: motionDurations.flash / 2 }),
      withDelay(40, withTiming(0, { duration: motionDurations.flash / 2 })),
    );
  }, [flashOpacity, heartScale]);

  const applyLike = useCallback(
    (next: LikeState) => {
      likeCache.set(item.log.id, next);
      setLike(next);
    },
    [item.log.id],
  );

  const toggleLike = useCallback(
    async (forceLike = false) => {
      if (likeBusy.current) return;
      const wasLiked = like.liked;
      if (forceLike && wasLiked) {
        // Double-tap on an already-liked post just replays the pop.
        popHeart();
        return;
      }
      likeBusy.current = true;

      const nextLiked = !wasLiked;
      const optimistic: LikeState = {
        ...like,
        liked: nextLiked,
        count: Math.max(0, like.count + (nextLiked ? 1 : -1)),
      };
      applyLike(optimistic);
      if (nextLiked) {
        popHeart();
        haptics.medium(); // haptics table: like = medium
      } else {
        haptics.light();
      }

      try {
        if (nextLiked) await likeLog(item.log.id);
        else await unlikeLog(item.log.id);
      } catch {
        // Revert optimistic update.
        applyLike({ ...like, liked: wasLiked, count: like.count });
        haptics.error();
      } finally {
        likeBusy.current = false;
      }
    },
    [applyLike, item.log.id, like, popHeart],
  );

  // ── Comments ──
  const [comments, setComments] = useState<FeedComment[]>(() =>
    [...item.comments].reverse().slice(0, 2),
  );
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [allExpanded, setAllExpanded] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  // Re-seed from the feed payload when it refreshes (same card identity,
  // new server data) — unless the full thread is already expanded.
  useEffect(() => {
    setCommentCount(item.commentCount);
    setAllExpanded((expanded) => {
      if (!expanded) setComments([...item.comments].reverse().slice(0, 2));
      return expanded;
    });
  }, [item.commentCount, item.comments]);

  const expandAllComments = useCallback(async () => {
    if (loadingAll || allExpanded) return;
    setLoadingAll(true);
    try {
      const all = await getLogComments(item.log.id, { limit: 100 });
      setComments([...all].reverse()); // newest first
      setAllExpanded(true);
    } catch {
      haptics.error();
    } finally {
      setLoadingAll(false);
    }
  }, [allExpanded, item.log.id, loadingAll]);

  const handleComposerSubmit = useCallback(
    async (text: string) => {
      const comment = await onComment(item.log.id, text);
      if (!comment) return false;
      // New comment pops in at top of list + count bumps (SpringNumber).
      setComments((prev) => [comment, ...prev]);
      setCommentCount((n) => n + 1);
      onCommentAdded(item.log.id, comment);
      return true;
    },
    [item.log.id, onComment, onCommentAdded],
  );

  // ── Navigation ──
  const openLog = useCallback(() => {
    haptics.light();
    router.push({ pathname: '/log/[id]', params: { id: item.log.id } });
  }, [item.log.id, router]);

  const openProfile = useCallback(() => {
    router.push({ pathname: '/profile/[id]', params: { id: item.user.id } });
  }, [item.user.id, router]);

  const openArtist = useCallback(() => {
    router.push({ pathname: '/artist/[artistId]', params: { artistId: item.event.artist.id } });
  }, [item.event.artist.id, router]);

  const openVenue = useCallback(() => {
    router.push({ pathname: '/venue/[venueId]', params: { venueId: item.event.venue.id } });
  }, [item.event.venue.id, router]);

  const openEvent = useCallback(() => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: item.event.id } });
  }, [item.event.id, router]);

  const handleShare = useCallback(async () => {
    const who = item.user.displayName || item.user.username;
    const msg = `${who} was at ${item.event.artist.name} • ${item.event.venue.name} (${item.event.venue.city})`;
    try {
      await Share.share({ message: msg });
    } catch {
      // ignore
    }
  }, [item]);

  // ── Media ──
  const photos: FeedPhoto[] = item.log.photos?.length
    ? item.log.photos
    : item.event.artist.imageUrl
      ? [{ id: `artist-${item.event.artist.id}`, photoUrl: item.event.artist.imageUrl }]
      : [];

  const likedBy = like.likers.filter((u) => u.id !== currentUserId);
  const firstLiker = like.liked ? 'you' : likedBy[0]?.username;
  const othersCount = Math.max(0, like.count - 1);

  const visibleComments = allExpanded ? comments : comments.slice(0, 2);

  const score =
    typeof item.log.rating === 'number' && item.log.rating > 0 ? item.log.rating : null;
  const highScore = score != null && score >= 9;

  return (
    <Animated.View layout={LinearTransition.duration(motionDurations.expand)} style={styles.card}>
      {/* ── 1. Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={openProfile}
          style={styles.headerUser}
          accessibilityRole="button"
          accessibilityLabel={`View @${item.user.username}'s profile`}
        >
          <Avatar uri={item.user.avatarUrl} name={item.user.displayName || item.user.username} size={36} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitleLine} numberOfLines={1}>
              <Text style={styles.username}>{item.user.username}</Text>
              <Text style={styles.loggedLabel}>  logged a show</Text>
            </Text>
            <Text style={styles.headerMeta} numberOfLines={1}>
              {item.event.venue.name} · {formatDate(item.event.date)}
            </Text>
          </View>
        </Pressable>
        <SpringPressable
          onPress={handleShare}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={c.mute} />
        </SpringPressable>
      </View>

      {/* ── 2. Media carousel ── */}
      {photos.length > 0 ? (
        <FeedCardPhotos
          photos={photos}
          onPressMedia={openLog}
          onDoubleTapLike={() => void toggleLike(true)}
        />
      ) : (
        <Pressable
          onPress={openLog}
          style={styles.mediaFallback}
          accessibilityRole="button"
          accessibilityLabel="Open show log"
        >
          <Ionicons name="musical-notes" size={40} color={c.muteSoft} />
        </Pressable>
      )}

      {/* ── 3. Action row ── */}
      <View style={styles.actionRow}>
        <SpringPressable
          onPress={() => void toggleLike()}
          style={styles.actionItem}
          accessibilityRole="button"
          accessibilityLabel={like.liked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: like.liked }}
        >
          <View>
            <Animated.View style={[styles.heartFlash, flashStyle]} />
            <Animated.View style={heartStyle}>
              <Ionicons
                name={like.liked ? 'heart' : 'heart-outline'}
                size={22}
                color={like.liked ? c.error : c.fg}
              />
            </Animated.View>
          </View>
          {like.count > 0 ? (
            <SpringNumber value={like.count} animateOnMount={false} style={styles.actionCount} />
          ) : null}
        </SpringPressable>

        <SpringPressable
          onPress={() => composerRef.current?.focus()}
          style={styles.actionItem}
          accessibilityRole="button"
          accessibilityLabel="Comment"
        >
          <Ionicons name="chatbubble-outline" size={20} color={c.fg} />
          {commentCount > 0 ? (
            <SpringNumber value={commentCount} animateOnMount={false} style={styles.actionCount} />
          ) : null}
        </SpringPressable>

        <SpringPressable
          onPress={handleShare}
          style={styles.actionItem}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="arrow-redo-outline" size={20} color={c.fg} />
        </SpringPressable>

        <View style={{ flex: 1 }} />

        {/* Saved — no backend yet; disabled tap shakes per INTERACTIONS.md */}
        <SpringPressable
          disabled
          style={styles.actionItem}
          accessibilityRole="button"
          accessibilityLabel="Save — coming soon"
        >
          <Ionicons name="bookmark-outline" size={20} color={c.muteSoft} />
        </SpringPressable>
      </View>

      {/* ── 4. Liked by ── */}
      {like.count > 0 && firstLiker ? (
        <View style={styles.likedByRow}>
          {likedBy.length > 0 ? (
            <AvatarStack
              avatars={likedBy.slice(0, 3).map((u) => ({ uri: u.avatarUrl ?? null, name: u.username }))}
              size={18}
            />
          ) : null}
          <Text style={styles.likedByText} numberOfLines={1}>
            Liked by <Text style={styles.likedByName}>{firstLiker}</Text>
            {othersCount > 0 ? (
              <>
                {' and '}
                <Text style={styles.likedByName}>
                  {othersCount}
                  {like.hasMore ? '+' : ''} other{othersCount === 1 && !like.hasMore ? '' : 's'}
                </Text>
              </>
            ) : null}
          </Text>
        </View>
      ) : null}

      {/* ── 5. Caption ── */}
      <View style={styles.caption}>
        <View style={styles.captionTopRow}>
          <Pressable
            style={styles.captionArtistWrap}
            onPress={openArtist}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.event.artist.name}`}
          >
            <Text style={styles.artistName} numberOfLines={2}>
              {item.event.artist.name}
            </Text>
          </Pressable>
          {score != null ? (
            <View style={styles.scoreChip} accessibilityLabel={`Rated ${formatScore(score)} out of 10`}>
              <Text style={[styles.scoreText, highScore && { color: c.accent }]}>
                {formatScore(score)}
              </Text>
            </View>
          ) : null}
        </View>
        {item.event.name ? (
          <Text style={styles.tourText} numberOfLines={1}>
            {item.event.name}
          </Text>
        ) : null}
        {item.log.note ? <Text style={styles.note}>{item.log.note}</Text> : null}
      </View>

      {/* ── 6. Who was here ── */}
      <WhoWasHere logId={item.log.id} wasThereCount={item.wasThereCount} currentUserId={currentUserId} />

      {/* ── 7. Links row ── */}
      <Animated.View layout={LinearTransition.duration(motionDurations.expand)} style={styles.linksRow}>
        {(
          [
            { label: 'setlist', onPress: openEvent },
            { label: 'tips', onPress: openVenue },
            { label: 'artist', onPress: openArtist },
            { label: 'venue', onPress: openVenue },
          ] as const
        ).map((chip) => (
          <SpringPressable
            key={chip.label}
            onPress={chip.onPress}
            haptic="light"
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={chip.label}
          >
            <Text style={styles.chipText}>{chip.label}</Text>
          </SpringPressable>
        ))}
      </Animated.View>

      {/* ── 8. Comments ── */}
      {visibleComments.length > 0 || commentCount > 0 ? (
        <Animated.View layout={LinearTransition.duration(motionDurations.expand)} style={styles.comments}>
          {visibleComments.map((cm, i) => (
            <Animated.View
              key={cm.id}
              entering={FadeInDown.delay(Math.min(i, 5) * motionDurations.rowStagger).duration(200)}
              layout={LinearTransition.duration(200)}
              style={styles.commentRow}
            >
              <Pressable
                onPress={() => router.push({ pathname: '/profile/[id]', params: { id: cm.user.id } })}
                accessibilityRole="button"
                accessibilityLabel={`View @${cm.user.username}'s profile`}
              >
                <Avatar uri={cm.user.avatarUrl} name={cm.user.displayName || cm.user.username} size={22} />
              </Pressable>
              <View style={styles.commentBody}>
                <Text style={styles.commentText}>
                  <Text style={styles.commentUser}>{cm.user.username}</Text> {cm.text}
                </Text>
                <Text style={styles.commentTime}>{relTime(cm.createdAt)}</Text>
              </View>
            </Animated.View>
          ))}

          {!allExpanded && commentCount > visibleComments.length ? (
            <Pressable onPress={expandAllComments} accessibilityRole="button">
              <Animated.Text entering={FadeIn.duration(motionDurations.crossfade)} style={styles.viewAll}>
                {loadingAll ? 'loading…' : `View all ${commentCount} comments`}
              </Animated.Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {/* ── 9. Pinned composer ── */}
      <Animated.View layout={LinearTransition.duration(motionDurations.expand)}>
        <PinnedComposer
          ref={composerRef}
          avatarUrl={viewerAvatarUrl}
          name={viewerName}
          onSubmit={handleComposerSubmit}
        />
      </Animated.View>
    </Animated.View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: tokens.colors.card,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: tokens.colors.hairline,
      overflow: 'hidden',
    },

    /* Header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingHorizontal: 14,
      marginVertical: 4,
    },
    headerUser: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerInfo: {
      flex: 1,
    },
    headerTitleLine: {
      fontSize: 14,
    },
    username: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    loggedLabel: {
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.mute,
    },
    headerMeta: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 0.2,
      color: tokens.colors.mute,
      marginTop: 3,
    },
    menuBtn: {
      padding: 8,
    },

    /* Media fallback */
    mediaFallback: {
      width: '100%',
      aspectRatio: 16 / 10,
      backgroundColor: tokens.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Action row */
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 16,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCount: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 12,
      color: tokens.colors.mute,
    },
    heartFlash: {
      position: 'absolute',
      top: -6,
      left: -6,
      right: -6,
      bottom: -6,
      borderRadius: tokens.radius.full,
      backgroundColor: tokens.colors.error,
    },

    /* Liked by */
    likedByRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 8,
    },
    likedByText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '400',
      color: tokens.colors.mute,
    },
    likedByName: {
      fontWeight: '600',
      color: tokens.colors.fg,
    },

    /* Caption */
    caption: {
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    captionTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    captionArtistWrap: {
      flex: 1,
    },
    artistName: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: tokens.colors.fg,
      lineHeight: 25,
    },
    scoreChip: {
      minWidth: 34,
      paddingHorizontal: 8,
      height: 28,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    scoreText: {
      fontFamily: tokens.fontFamilies.monoBold,
      fontSize: 15,
      letterSpacing: 0.2,
      color: tokens.colors.fg,
    },
    tourText: {
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.mute,
      marginTop: 4,
    },
    note: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: tokens.colors.textSoft,
      marginTop: 8,
    },

    /* Links row */
    linksRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 12,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: tokens.radius.full,
      backgroundColor: tokens.colors.card2,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.colors.mute,
    },

    /* Comments */
    comments: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 8,
    },
    commentRow: {
      flexDirection: 'row',
      gap: 8,
    },
    commentBody: {
      flex: 1,
    },
    commentText: {
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 18,
      color: tokens.colors.textSoft,
    },
    commentUser: {
      fontWeight: '600',
      color: tokens.colors.fg,
    },
    commentTime: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 9,
      letterSpacing: 0.4,
      color: tokens.colors.muteSoft,
      marginTop: 2,
    },
    viewAll: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.colors.mute,
      paddingVertical: 2,
    },
  });
