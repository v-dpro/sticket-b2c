// MemoryFloatCard — the featured card of the floating memory viewer
// (/memory/[logId]). Same anatomy as FeedCard v3 ("the post is the photo"):
// the media carousel IS the card (FeedCardPhotos, card variant) with the
// identical over-photo chrome — blurred author pill (top-left), the score
// as giant bare mono digits on media / rotated stamp on the flat fallback
// (C2), artist 800 / StubDetailsRow venue·date strip / caption on the bottom
// scrim, plus the was-here facepile bottom-right when the serializer inlined
// attendees.
//
// Renders from MemoryCardData, a partial-friendly projection of FeedItem so
// the viewer can paint instantly from the fast-path route params (photoUrl /
// artistName / score / eventName) and hydrate the rest from GET /logs/:id.

import { StyleSheet, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { FeedItem, FeedPhoto } from '../../types/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { BareScore, StubDetailsRow } from '../ui/Stub';
import { FeedCardPhotos } from '../feed/FeedCardPhotos';
import { WereHereFacepile, type FacepileUser } from '../feed/WereHereFacepile';
import { formatMemoryAge, formatMemoryDate } from './format';

export interface MemoryCardUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Partial-friendly card data. The fast path fills logId + eventId/eventName/
 * artistName/score + one photo; hydration (GET /logs/:id) or a rail swap
 * (event-feed FeedItem) fills everything else.
 */
export interface MemoryCardData {
  logId: string;
  createdAt?: string;
  user?: MemoryCardUser;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  artistName?: string;
  venueName?: string;
  note?: string;
  score?: number | null;
  photos: FeedPhoto[];
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
  wasThereCount?: number;
  wasThereUsers?: FacepileUser[];
  // Accepted co-authors (C13 joint post) — no feed payload carries them, so
  // the viewer route fills this from GET /logs/:id/coauthors where allowed.
  coAuthors?: MemoryCardUser[];
}

/** Project a feed item (feed / event feed / log detail) onto the card shape. */
export function feedItemToMemoryCard(item: FeedItem): MemoryCardData {
  const photos: FeedPhoto[] = item.log.photos?.length
    ? item.log.photos
    : item.event.artist.imageUrl
      ? [{ id: `artist-${item.event.artist.id}`, photoUrl: item.event.artist.imageUrl }]
      : [];

  return {
    logId: item.log.id,
    createdAt: item.createdAt,
    user: item.user,
    eventId: item.event.id,
    eventName: item.event.name,
    eventDate: item.event.date,
    artistName: item.event.artist.name,
    venueName: item.event.venue.name,
    note: item.log.note,
    score: typeof item.log.rating === 'number' && item.log.rating > 0 ? item.log.rating : null,
    photos,
    likeCount: item.likeCount,
    likedByMe: item.likedByMe,
    commentCount: item.commentCount,
    wasThereCount: item.wasThereCount,
    wasThereUsers: item.wasThereUsers,
  };
}

interface MemoryFloatCardProps {
  data: MemoryCardData;
  /** Media aspect ratio (height / width) — the route sizes it to fit. */
  aspectRatio: number;
  /** Viewer id — resolves the "you" author pill. */
  currentUserId?: string;
  /** Single tap on media → open the full memory screen. */
  onPressMedia: () => void;
  /** Double tap anywhere on media → like (burst renders in FeedCardPhotos). */
  onDoubleTapLike: () => void;
  /** Tap the was-here facepile → WereHereSheet. */
  onPressFacepile?: () => void;
}

export function MemoryFloatCard({
  data,
  aspectRatio,
  currentUserId,
  onPressMedia,
  onDoubleTapLike,
  onPressFacepile,
}: MemoryFloatCardProps) {
  const styles = useThemedStyles(buildStyles);

  const isSelf = Boolean(currentUserId && data.user?.id === currentUserId);
  const score = typeof data.score === 'number' && data.score > 0 ? data.score : null;
  const venueDate = [data.venueName, formatMemoryDate(data.eventDate)].filter(Boolean).join(' · ');
  const facepileUsers = data.wasThereUsers ?? [];
  // C13 joint post — the pill becomes a "maya × jordan" byline. Dual scores
  // stay degraded to the single BareScore: no payload carries the co-author's
  // own score (would need coAuthors[].score).
  const coAuthors = data.coAuthors ?? [];

  // Over-photo chrome — identical treatment to FeedCard v3.
  const overlay = (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.overlayTop} pointerEvents="box-none">
        {data.user ? (
          // Solid pill (same treatment as the score chip) — per-card BlurView is a scroll-perf trap.
          <View style={styles.authorPill}>
            <Avatar
              uri={data.user.avatarUrl}
              name={data.user.displayName || data.user.username}
              size={20}
            />
            <Text style={styles.authorName} numberOfLines={1}>
              {isSelf ? 'you' : data.user.username}
              {coAuthors.length > 0 ? ` × ${coAuthors[0].username}` : ''}
              {coAuthors.length > 1 ? ` +${coAuthors.length - 1}` : ''}
            </Text>
            {data.createdAt ? <Text style={styles.authorAge}>{formatMemoryAge(data.createdAt)}</Text> : null}
          </View>
        ) : (
          <View />
        )}
        {score != null ? (
          // C2 — the on-media score body. The no-media fallback is a FIXED
          // dark media tile (white chrome), so the bare digits apply there
          // too; ScoreStamp would ink theme-fg (dark-on-dark in light mode).
          <BareScore score={score} />
        ) : null}
      </View>

      <View style={styles.overlayBottom} pointerEvents="box-none">
        <View style={styles.overlayBottomText} pointerEvents="box-none">
          {data.artistName ? (
            <Text style={styles.artistName} numberOfLines={2}>
              {data.artistName}
            </Text>
          ) : null}
          {venueDate ? (
            <StubDetailsRow left={venueDate} onMedia style={styles.venueDate} />
          ) : null}
          {data.note ? (
            <Text style={styles.caption} numberOfLines={2}>
              {data.note}
            </Text>
          ) : null}
        </View>
        {facepileUsers.length > 0 && onPressFacepile ? (
          <WereHereFacepile
            users={facepileUsers}
            totalCount={data.wasThereCount ?? facepileUsers.length}
            onPress={onPressFacepile}
          />
        ) : null}
      </View>
    </View>
  );

  if (data.photos.length === 0) {
    // No-media fallback — fixed dark tile so the white chrome stays legible.
    return (
      <Pressable
        style={[styles.fallback, { aspectRatio: 1 / aspectRatio }]}
        onPress={onPressMedia}
        accessibilityRole="button"
        accessibilityLabel="Open memory"
      >
        <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.28)" />
        <View style={styles.fallbackScrim} pointerEvents="none" />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {overlay}
        </View>
      </Pressable>
    );
  }

  return (
    <FeedCardPhotos
      photos={data.photos}
      aspectRatio={aspectRatio}
      dotsPosition="right"
      showCounter={false}
      scrims
      radius={22}
      overlay={overlay}
      onPressMedia={onPressMedia}
      onDoubleTapLike={onDoubleTapLike}
    />
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    /* No-media fallback */
    fallback: {
      width: '100%',
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

    /* Over-photo overlay — mirrors FeedCard v3 */
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
    // Layout-only — type comes from StubDetailsRow (onMedia).
    venueDate: {
      alignSelf: 'stretch',
      marginTop: 5,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 7,
    },
  });
