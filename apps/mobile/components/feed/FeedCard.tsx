// FeedCard v4 — the SCORECARD STUB feed card (Phase C reskin).
//
// The post is a ticket stub. Full-bleed photo carousel at the top of the
// card (author chip top-left, giant BareScore top-right ON the photo), then
// the card surface: artist title + optional caption, the StubPerforation
// tear line (notches punch through to the stage bg), the mono
// StubDetailsRow ("VENUE · JUL 11 2026 · SEC 112" / "ADMIT 01"), and a
// social row — "♥ 24 · 6 COMMENTS" left, "3 WERE HERE →" right. Photo-less
// posts get a card2 StripeField media block behind the artist name; per C2
// that flat stock carries the ScoreStamp, never the bare score.
//
// Interactions are unchanged from v3:
//   · double-tap anywhere on the media → like (heart burst + haptic)
//   · single tap on the media → the floating memory viewer (/memory/[logId],
//     fast-path params for instant paint)
//   · tap "N WERE HERE →" → the Were-here sheet
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
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { BareScore, ScoreStamp, StripeField, StubDetailsRow, StubPerforation } from '../ui/Stub';
import { FeedCardPhotos } from './FeedCardPhotos';
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

// height ≈ 300 at 340pt width. FeedCardPhotos.aspectRatio is height/width.
const MEDIA_ASPECT = 300 / 340;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Stub-details date — "JUL 11 2026" (the strip uppercases itself). */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
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

  // Who-also-went sheet, opened from the "N WERE HERE" social-row target.
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

  // ── Joint post (C13) ──
  // Co-authors are only serialized on the timeline today; read them
  // defensively so the "maya × jordan" byline + "ADMIT 02" strip light up
  // when an API build inlines them on the feed item. The side-by-side dual
  // scores stay degraded to the author's single score — no payload carries
  // the co-author's own score (would need coAuthors[].score).
  const coAuthors =
    (item as { coAuthors?: { id: string; username: string }[] }).coAuthors ?? [];
  const admitLabel = `ADMIT ${String(coAuthors.length + 1).padStart(2, '0')}`;

  // ── Stub details ──
  // Section is only serialized on LogDetail; read it defensively so it
  // appears when an API build inlines it on the feed item.
  const section = (item.log as { section?: string }).section;
  const detailsLeft = `${item.event.venue.name} · ${formatDate(item.event.date)}${
    section ? ` · SEC ${section}` : ''
  }`;

  const wereHereCount = item.wasThereUsers?.length
    ? Math.max(item.wasThereCount, item.wasThereUsers.length)
    : 0;

  // Over-media chrome — author chip + score. C2: the bare score rides
  // photos; the photo-less stripe block is flat stock, so it gets the stamp.
  const renderOverlayTop = (onPhoto: boolean) => (
    <View style={styles.overlayTop} pointerEvents="box-none">
      <View style={styles.authorPill}>
        <Avatar uri={item.user.avatarUrl} name={item.user.displayName || item.user.username} size={20} />
        <Text style={styles.authorName} numberOfLines={1}>
          {isSelf ? 'you' : item.user.username}
          {coAuthors.length > 0 ? ` × ${coAuthors[0].username}` : ''}
          {coAuthors.length > 1 ? ` +${coAuthors.length - 1}` : ''}
        </Text>
        <Text style={styles.authorAge}>{formatAge(item.createdAt)}</Text>
      </View>
      {score != null ? (
        onPhoto ? <BareScore score={score} size={34} /> : <ScoreStamp score={score} size={15} />
      ) : null}
    </View>
  );

  return (
    <Animated.View layout={LinearTransition.duration(motionDurations.expand)} style={styles.wrapper}>
      <View style={styles.card}>
        {/* Media — full-bleed at the top of the stub, top corners clipped */}
        <View style={styles.mediaClip}>
          {photos.length > 0 ? (
            <FeedCardPhotos
              photos={photos}
              aspectRatio={MEDIA_ASPECT}
              dotsPosition="right"
              showCounter={false}
              overlay={renderOverlayTop(true)}
              onPressMedia={openMemoryViewer}
              onDoubleTapLike={() => void likeFromDoubleTap()}
            />
          ) : (
            <Pressable
              style={styles.stripeBlock}
              onPress={openMemoryViewer}
              accessibilityRole="button"
              accessibilityLabel="Open memory"
            >
              <StripeField />
              <Text style={styles.stripeArtist} numberOfLines={2}>
                {item.event.artist.name}
              </Text>
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {renderOverlayTop(false)}
              </View>
            </Pressable>
          )}
        </View>

        {/* Card surface — title + caption above the tear */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.event.artist.name}
          </Text>
          {item.log.note ? (
            <Text style={styles.caption} numberOfLines={2}>
              {item.log.note}
            </Text>
          ) : null}
        </View>

        <StubPerforation notchColor={c.bg} />

        <StubDetailsRow left={detailsLeft} right={admitLabel} style={styles.detailsRow} />

        {/* Social row — counts left, who-went right */}
        <View style={styles.socialRow}>
          <View style={styles.socialLeft}>
            {like.count > 0 ? (
              <>
                <Ionicons
                  name="heart"
                  size={12}
                  color={like.liked ? c.like : c.mute}
                  style={styles.heartGlyph}
                />
                <Text style={styles.socialText}>{like.count}</Text>
              </>
            ) : null}
            {like.count > 0 && item.commentCount > 0 ? <Text style={styles.socialDot}>·</Text> : null}
            {item.commentCount > 0 ? (
              <Text style={styles.socialText}>
                {item.commentCount} {item.commentCount === 1 ? 'COMMENT' : 'COMMENTS'}
              </Text>
            ) : null}
          </View>
          {wereHereCount > 0 ? (
            <Pressable
              onPress={openWereHere}
              hitSlop={8}
              style={styles.wereHereCluster}
              accessibilityRole="button"
              accessibilityLabel={`${wereHereCount} ${wereHereCount === 1 ? 'person was' : 'people were'} here`}
            >
              {item.wasThereUsers?.length ? (
                <DegreeFacepile
                  people={item.wasThereUsers}
                  size={24}
                  max={4}
                  surfaceColor={c.card}
                />
              ) : null}
              <Text style={styles.wereHereText}>
                {wereHereCount} {wereHereCount === 1 ? 'WAS' : 'WERE'} HERE →
              </Text>
            </Pressable>
          ) : null}
        </View>
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

    /* The stub card. No overflow:hidden here — the perforation notches
       punch past the card edges (media clips itself in mediaClip). */
    card: {
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radius.stub,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      ...tokens.shadows.card,
    },
    mediaClip: {
      borderTopLeftRadius: tokens.radius.stub - 1,
      borderTopRightRadius: tokens.radius.stub - 1,
      overflow: 'hidden',
    },

    /* Photo-less media block — flat ticket stock (card2 + stripes). */
    stripeBlock: {
      height: 170,
      backgroundColor: tokens.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    stripeArtist: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.4,
      textAlign: 'center',
      color: tokens.colors.fg,
    },

    /* Over-media chrome */
    overlayTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 12,
    },
    /* Solid pill — per-card BlurView is a scroll-perf trap. */
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

    /* Card surface */
    body: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
    },
    title: {
      fontSize: tokens.fonts.cardTitle,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: tokens.colors.fg,
    },
    caption: {
      fontSize: 13.5,
      fontWeight: '400',
      lineHeight: 18,
      color: tokens.colors.text,
      marginTop: 5,
    },
    detailsRow: {
      paddingHorizontal: 14,
      paddingTop: 11,
    },

    /* Social row */
    socialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
      minHeight: 18,
    },
    socialLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heartGlyph: {
      marginRight: 4,
    },
    socialText: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    socialDot: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      color: tokens.colors.mute,
      marginHorizontal: 5,
    },
    wereHereCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    wereHereText: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      color: tokens.colors.muteSoft,
    },
  });
