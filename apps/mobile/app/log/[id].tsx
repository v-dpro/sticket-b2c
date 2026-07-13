// Memory post — app/log/[id].tsx (SCREENS.md "Memory post").
// Rebuilt for the "Encore, muted" system: full-bleed hero carousel →
// author row → monochrome action row → liked-by → title + metadata strip
// (score / seat / date chips) → caption → "who was here" → comments →
// pinned composer. Fully tokenized (both modes); owner ⋯ menu (edit/delete).
//
// Route contract preserved: params { id }, data via GET /logs/:id
// (lib/api/feed getLogDetail, surfaced by hooks/useLogDetail).

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FeedPhoto } from '../../types/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics, motionDurations, springs, tearIn } from '../../lib/motion';
import { getLogLikes, likeLog, unlikeLog, type LogLikeUser } from '../../lib/api/feed';
import { deleteLog, getCoAuthors, respondCoAuthor, type LogCoAuthor } from '../../lib/api/logs';
import { useLogDetail } from '../../hooks/useLogDetail';
import { useSession } from '../../hooks/useSession';
import { Avatar } from '../../components/ui/Avatar';
import { AvatarStack } from '../../components/ui/AvatarStack';
import { ErrorState } from '../../components/ui/ErrorState';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { BareScore, ScoreStamp } from '../../components/ui/Stub';
import { FeedCardPhotos } from '../../components/feed/FeedCardPhotos';
import { PinnedComposer } from '../../components/feed/PinnedComposer';
import { WhoWasHere } from '../../components/feed/WhoWasHere';
import { ShareButton } from '../../components/share/ShareButton';
import { createLogLink } from '../../lib/share/deepLinks';
import type { ShareCardData } from '../../types/share';

const HERO_RATIO = 5 / 4; // 4:5 portrait hero (height / width)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function LogDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = id || '';

  const { user, profile } = useSession();
  const { data, loading, refreshing, error, refresh, submitComment } = useLogDetail(logId);

  const composerRef = useRef<{ focus: () => void }>(null);

  // ── Likes (heart) — mirrors the feed's like semantics ──
  const [like, setLike] = useState<{ liked: boolean; count: number; likers: LogLikeUser[] }>({
    liked: false,
    count: 0,
    likers: [],
  });
  const likeBusy = useRef(false);

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getLogLikes(logId, { limit: 50 });
        if (cancelled) return;
        setLike({
          liked: user?.id ? res.likes.some((l) => l.user.id === user.id) : false,
          count: res.likes.length,
          likers: res.likes.map((l) => l.user),
        });
      } catch {
        // non-fatal — like row simply stays hidden
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logId, user?.id]);

  // ── Co-authors (joint posts) ──
  // GET /logs/:id doesn't carry co-authors, so fetch them separately. The list
  // yields both the accepted "maya × jordan" byline (C13) and — if the viewer
  // has a pending invite — the inline accept/decline banner.
  const [coAuthors, setCoAuthors] = useState<LogCoAuthor[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);

  const loadCoAuthors = useCallback(async () => {
    if (!logId) return;
    try {
      setCoAuthors(await getCoAuthors(logId));
    } catch {
      // non-fatal — viewer may not be owner/invitee; row simply stays hidden
      setCoAuthors([]);
    }
  }, [logId]);

  useEffect(() => {
    void loadCoAuthors();
  }, [loadCoAuthors]);

  const respondInvite = useCallback(
    async (accept: boolean) => {
      if (inviteBusy) return;
      setInviteBusy(true);
      try {
        await respondCoAuthor(logId, accept);
        haptics.success();
        await loadCoAuthors();
      } catch {
        haptics.error();
      } finally {
        setInviteBusy(false);
      }
    },
    [inviteBusy, loadCoAuthors, logId],
  );

  // Heart pop animation.
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const popHeart = useCallback(() => {
    heartScale.value = withSequence(
      withTiming(1.35, { duration: motionDurations.heartPop / 2 }),
      withSpring(1, springs.press),
    );
  }, [heartScale]);

  const toggleLike = useCallback(
    async (forceLike = false) => {
      if (likeBusy.current) return;
      const wasLiked = like.liked;
      if (forceLike && wasLiked) {
        popHeart();
        return;
      }
      likeBusy.current = true;
      const nextLiked = !wasLiked;
      setLike((prev) => ({ ...prev, liked: nextLiked, count: Math.max(0, prev.count + (nextLiked ? 1 : -1)) }));
      if (nextLiked) {
        popHeart();
        haptics.medium();
      } else {
        haptics.light();
      }
      try {
        if (nextLiked) await likeLog(logId);
        else await unlikeLog(logId);
      } catch {
        setLike((prev) => ({ ...prev, liked: wasLiked, count: Math.max(0, prev.count + (nextLiked ? -1 : 1)) }));
        haptics.error();
      } finally {
        likeBusy.current = false;
      }
    },
    [like.liked, logId, popHeart],
  );

  // ── Comments ──
  const handleComposerSubmit = useCallback(
    async (text: string) => {
      const comment = await submitComment(text);
      return Boolean(comment);
    },
    [submitComment],
  );

  // ── Share ──
  const shareData = useMemo<ShareCardData | null>(() => {
    if (!data) return null;
    return {
      type: 'log',
      log: {
        artistName: data.event.artist.name,
        artistImage: data.event.artist.imageUrl || undefined,
        venueName: data.event.venue.name,
        venueCity: data.event.venue.city,
        date: data.event.date,
        rating: data.log.rating ?? undefined,
        photo: data.log.photos?.[0]?.photoUrl || undefined,
      },
    };
  }, [data]);

  // ── Owner actions ──
  const isOwner = Boolean(user?.id && data?.user.id === user.id);

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete this memory?', 'This removes your rating, notes, and photos for this show.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(logId);
            haptics.success();
            router.back();
          } catch {
            haptics.error();
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  }, [logId, router]);

  const openOwnerMenu = useCallback(() => {
    if (!data) return;
    haptics.light();
    Alert.alert('Memory options', undefined, [
      {
        text: 'Edit',
        onPress: () =>
          router.push({ pathname: '/log/details', params: { eventId: data.event.id } }),
      },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [confirmDelete, data, router]);

  // ── Render ──
  const topInset = insets.top;

  if (loading && !data) {
    return (
      <ScreenShell styles={styles}>
        <Stack.Screen options={{ headerShown: false }} />
        <LogSkeleton styles={styles} />
      </ScreenShell>
    );
  }

  if ((error && !data) || !data) {
    return (
      <ScreenShell styles={styles}>
        <Stack.Screen options={{ headerShown: false }} />
        <FloatingTopBar styles={styles} topInset={topInset} c={c} />
        <View style={styles.centerFill}>
          <ErrorState
            title="Couldn't load this memory"
            message={error || 'It may have been removed.'}
            onRetry={refresh}
          />
        </View>
      </ScreenShell>
    );
  }

  const photos: FeedPhoto[] = data.log.photos ?? [];
  const authorName = data.user.displayName || data.user.username;

  const score = typeof data.log.rating === 'number' && data.log.rating > 0 ? data.log.rating : null;

  const seatParts: string[] = [];
  if (data.log.section) seatParts.push(`Sec ${data.log.section}`);
  if (data.log.row) seatParts.push(`Row ${data.log.row}`);
  if (data.log.seat) seatParts.push(`Seat ${data.log.seat}`);
  const seatText = seatParts.join(' · ');

  const likers = like.likers.filter((u) => u.id !== user?.id);
  const firstLiker = like.liked ? 'you' : likers[0]?.username;
  const likeOthers = Math.max(0, like.count - 1);

  const comments = data.allComments ?? data.comments ?? [];

  const acceptedCoAuthors = coAuthors.filter((ca) => ca.status === 'ACCEPTED');
  const myInvite = coAuthors.find((ca) => ca.user.id === user?.id && ca.status === 'INVITED');

  return (
    <ScreenShell styles={styles}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        // NO RefreshControl here: this screen is a bottom sheet — a pull
        // must hand the drag to the native modal dismiss, not a reload.
      >
        {/* ── 1. Hero ── */}
        {photos.length > 0 ? (
          <View>
            <FeedCardPhotos
              photos={photos}
              aspectRatio={HERO_RATIO}
              onPressMedia={() => {}}
              onDoubleTapLike={() => void toggleLike(true)}
            />
            {/* C2: on media the score is the giant bare mono digits. */}
            {score != null ? (
              <View pointerEvents="none" style={{ position: 'absolute', right: 16, bottom: 16 }}>
                <BareScore score={score} />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.heroFallback}>
            {data.event.artist.imageUrl ? (
              <Avatar uri={data.event.artist.imageUrl} name={data.event.artist.name} size={72} />
            ) : (
              <Ionicons name="musical-notes" size={48} color={c.muteSoft} />
            )}
            <Text style={styles.heroFallbackArtist} numberOfLines={2}>
              {data.event.artist.name}
            </Text>
          </View>
        )}

        {/* ── 2. Author row ── */}
        <View style={styles.authorRow}>
          <Pressable
            style={styles.authorLeft}
            onPress={() => { haptics.light(); router.push({ pathname: '/profile/[id]', params: { id: data.user.id } }); }}
            accessibilityRole="button"
            accessibilityLabel={`View @${data.user.username}'s profile`}
          >
            {/* Joint post (C13): one memory owned by both — stacked avatars
                and a "maya × jordan" byline instead of a "with @…" credit. */}
            {acceptedCoAuthors.length > 0 ? (
              <AvatarStack
                avatars={[
                  { uri: data.user.avatarUrl ?? null, name: authorName },
                  ...acceptedCoAuthors.slice(0, 2).map((ca) => ({
                    uri: ca.user.avatarUrl ?? null,
                    name: ca.user.displayName || ca.user.username,
                  })),
                ]}
                size={36}
              />
            ) : (
              <Avatar uri={data.user.avatarUrl} name={authorName} size={36} />
            )}
            <View style={styles.authorInfo}>
              <Text style={styles.authorLine} numberOfLines={1}>
                <Text style={styles.authorName}>
                  {data.user.username}
                  {acceptedCoAuthors.length > 0
                    ? ` × ${acceptedCoAuthors[0].user.username}`
                    : ''}
                  {acceptedCoAuthors.length > 1 ? ` +${acceptedCoAuthors.length - 1}` : ''}
                </Text>
                <Text style={styles.authorMuted}>  logged a show</Text>
              </Text>
              <Text style={styles.authorTime}>{relTime(data.createdAt)}</Text>
            </View>
          </Pressable>
        </View>

        {/* ── 2b. Pending co-author invite for the viewer — accept / decline ── */}
        {myInvite ? (
          <View style={styles.inviteBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>You’re invited to co-author this</Text>
              <Text style={styles.inviteSub}>Accept and it lands on your timeline too.</Text>
            </View>
            <View style={styles.inviteActions}>
              <SpringPressable
                onPress={() => void respondInvite(false)}
                disabled={inviteBusy}
                haptic="light"
                style={styles.declineBtn}
                accessibilityRole="button"
                accessibilityLabel="Decline co-author invite"
              >
                <Text style={styles.declineText}>Decline</Text>
              </SpringPressable>
              <SpringPressable
                onPress={() => void respondInvite(true)}
                disabled={inviteBusy}
                haptic="medium"
                style={styles.acceptBtn}
                accessibilityRole="button"
                accessibilityLabel="Accept co-author invite"
              >
                <Text style={styles.acceptText}>Accept</Text>
              </SpringPressable>
            </View>
          </View>
        ) : null}

        {/* ── 3. Action row ── */}
        <View style={styles.actionRow}>
          <SpringPressable
            onPress={() => void toggleLike()}
            haptic="none" // toggleLike fires its own tier (medium like / light unlike)
            style={styles.actionItem}
            accessibilityRole="button"
            accessibilityLabel={like.liked ? 'Unlike' : 'Like'}
            accessibilityState={{ selected: like.liked }}
          >
            <Animated.View style={heartStyle}>
              <Ionicons
                name={like.liked ? 'heart' : 'heart-outline'}
                size={24}
                color={like.liked ? c.like : c.fg}
              />
            </Animated.View>
            {like.count > 0 ? <Text style={styles.actionCount}>{like.count}</Text> : null}
          </SpringPressable>

          <SpringPressable
            onPress={() => composerRef.current?.focus()}
            style={styles.actionItem}
            accessibilityRole="button"
            accessibilityLabel="Comment"
          >
            <Ionicons name="chatbubble-outline" size={22} color={c.fg} />
            {data.commentCount > 0 ? <Text style={styles.actionCount}>{data.commentCount}</Text> : null}
          </SpringPressable>

          {shareData ? (
            <ShareButton
              data={shareData}
              link={createLogLink(logId)}
              renderTrigger={(onPress) => (
                <SpringPressable
                  onPress={onPress}
                  style={styles.actionItem}
                  accessibilityRole="button"
                  accessibilityLabel="Share"
                >
                  <Ionicons name="arrow-redo-outline" size={22} color={c.fg} />
                </SpringPressable>
              )}
            />
          ) : null}

          <View style={{ flex: 1 }} />

          <SpringPressable disabled style={styles.actionItem} accessibilityLabel="Save — coming soon">
            <Ionicons name="bookmark-outline" size={22} color={c.muteSoft} />
          </SpringPressable>
        </View>

        {/* ── 4. Liked by ── */}
        {like.count > 0 && firstLiker ? (
          <View style={styles.likedByRow}>
            {likers.length > 0 ? (
              <AvatarStack
                avatars={likers.slice(0, 3).map((u) => ({ uri: u.avatarUrl ?? null, name: u.username }))}
                size={18}
              />
            ) : null}
            <Text style={styles.likedByText} numberOfLines={1}>
              Liked by <Text style={styles.likedByName}>{firstLiker}</Text>
              {likeOthers > 0 ? (
                <>
                  {' and '}
                  <Text style={styles.likedByName}>
                    {likeOthers} other{likeOthers === 1 ? '' : 's'}
                  </Text>
                </>
              ) : null}
            </Text>
          </View>
        ) : null}

        {/* ── 5. Title ── */}
        <Pressable
          style={styles.titleBlock}
          onPress={() => { haptics.light(); router.push({ pathname: '/artist/[artistId]', params: { artistId: data.event.artist.id } }); }}
          accessibilityRole="button"
          accessibilityLabel={`View ${data.event.artist.name}`}
        >
          <Text style={styles.titleArtist} numberOfLines={2}>
            {data.event.artist.name}
          </Text>
          <Text style={styles.titleMeta} numberOfLines={1}>
            {data.event.venue.name} · {formatDate(data.event.date)}
          </Text>
        </Pressable>

        {/* ── 6. Metadata strip ── */}
        <View style={styles.metaStrip}>
          {/* C2: one score body only — the stamp on the flat strip, unless the
              photos already carry the bare digits. */}
          {score != null && photos.length === 0 ? (
            <ScoreStamp score={score} size={15} style={{ alignSelf: 'center' }} />
          ) : null}
          {seatText ? (
            <View style={styles.chip}>
              <Ionicons name="location-outline" size={12} color={c.mute} />
              <Text style={styles.chipText}>{seatText}</Text>
            </View>
          ) : null}
          <View style={styles.chip}>
            <Ionicons name="calendar-outline" size={12} color={c.mute} />
            <Text style={styles.chipText}>{formatDate(data.event.date)}</Text>
          </View>
        </View>

        {/* ── 7. Caption / note ── */}
        {data.log.note ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteText}>
              <Text style={styles.noteUser}>{data.user.username} </Text>
              {data.log.note}
            </Text>
          </View>
        ) : null}

        {/* ── 8. Who was here ── */}
        {data.wasThereCount > 0 || (data.othersWhoWent?.length ?? 0) > 0 ? (
          <WhoWasHere logId={logId} wasThereCount={data.wasThereCount} currentUserId={user?.id} />
        ) : null}

        {/* ── 9. Comments ── */}
        <View style={styles.commentsBlock}>
          <Text style={styles.commentsHeader}>
            {data.commentCount > 0 ? `${data.commentCount} comment${data.commentCount === 1 ? '' : 's'}` : 'Comments'}
          </Text>
          {comments.length > 0 ? (
            comments.map((cm, i) => (
              <Animated.View
                key={cm.id}
                entering={tearIn(Math.min(i, 8) * motionDurations.rowStagger)}
                style={styles.commentRow}
              >
                <Pressable
                  onPress={() => { haptics.light(); router.push({ pathname: '/profile/[id]', params: { id: cm.user.id } }); }}
                  accessibilityRole="button"
                  accessibilityLabel={`View @${cm.user.username}'s profile`}
                >
                  <Avatar uri={cm.user.avatarUrl} name={cm.user.displayName || cm.user.username} size={28} />
                </Pressable>
                <View style={styles.commentBody}>
                  <Text style={styles.commentText}>
                    <Text style={styles.commentUser}>{cm.user.username}</Text> {cm.text}
                  </Text>
                  <Text style={styles.commentTime}>{relTime(cm.createdAt)}</Text>
                </View>
              </Animated.View>
            ))
          ) : (
            <Text style={styles.commentsEmpty}>No comments yet. Start the conversation.</Text>
          )}
        </View>

        {/* ── 10. Composer ── */}
        <PinnedComposer
          ref={composerRef}
          avatarUrl={profile?.avatarUrl}
          name={profile?.displayName || profile?.username}
          onSubmit={handleComposerSubmit}
        />
      </ScrollView>

      {/* Floating top bar (over hero) */}
      <FloatingTopBar
        styles={styles}
        topInset={topInset}
        c={c}
        right={
          <>
            {shareData ? (
              <ShareButton
                data={shareData}
                link={createLogLink(logId)}
                renderTrigger={(onPress) => (
                  <Pressable
                    onPress={onPress}
                    style={styles.topCircle}
                    accessibilityRole="button"
                    accessibilityLabel="Share"
                  >
                    <Ionicons name="paper-plane-outline" size={18} color={c.fg} />
                  </Pressable>
                )}
              />
            ) : null}
            {isOwner ? (
              <Pressable
                onPress={openOwnerMenu}
                style={styles.topCircle}
                accessibilityRole="button"
                accessibilityLabel="Memory options"
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={c.fg} />
              </Pressable>
            ) : null}
          </>
        }
      />
    </ScreenShell>
  );
}

// ── Building blocks ──

function ScreenShell({
  children,
  styles,
}: {
  children: React.ReactNode;
  styles: ReturnType<typeof buildStyles>;
}) {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
    </View>
  );
}

function FloatingTopBar({
  styles,
  topInset,
  c,
  right,
}: {
  styles: ReturnType<typeof buildStyles>;
  topInset: number;
  c: ThemeTokens['colors'];
  right?: React.ReactNode;
}) {
  // No back button — this is a bottom sheet: the grab handle says "slide
  // me down" and the native modal gesture does the closing.
  void c;
  return (
    <View style={[styles.topBar, { top: topInset + 6 }]} pointerEvents="box-none">
      <View style={styles.grabHandle} pointerEvents="none" />
      {/* Right-pinned now that the back button is gone (row would
          otherwise space-between the lone child to the left). */}
      <View style={[styles.topRight, { marginLeft: 'auto' }]}>{right}</View>
    </View>
  );
}

function LogSkeleton({ styles }: { styles: ReturnType<typeof buildStyles> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [progress]);
  const pulse = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.4, 0.8]) }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.skeletonHero, pulse]} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
        <Animated.View style={[styles.skeletonLineLg, pulse]} />
        <Animated.View style={[styles.skeletonLineSm, pulse]} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Animated.View style={[styles.skeletonChip, pulse]} />
          <Animated.View style={[styles.skeletonChip, pulse]} />
        </View>
      </View>
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: tokens.colors.bg,
    },
    centerFill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Floating top bar */
    topBar: {
      position: 'absolute',
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20,
    },
    grabHandle: {
      position: 'absolute',
      left: '50%',
      marginLeft: -18,
      top: 2,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.55)',
    },
    topRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    topCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: tokens.colors.card2,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Hero fallback */
    heroFallback: {
      width: '100%',
      aspectRatio: 16 / 10,
      backgroundColor: tokens.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 24,
    },
    heroFallbackArtist: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: tokens.colors.fg,
      textAlign: 'center',
    },

    /* Author row */
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    authorLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    authorInfo: {
      flex: 1,
    },
    authorLine: {
      fontSize: 14,
    },
    authorName: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    authorMuted: {
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.mute,
    },
    authorTime: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 11,
      color: tokens.colors.muteSoft,
      marginTop: 2,
    },

    /* Action row */
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      gap: 18,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCount: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 13,
      color: tokens.colors.mute,
    },

    /* Liked by */
    likedByRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    likedByText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.mute,
    },
    likedByName: {
      fontWeight: '600',
      color: tokens.colors.fg,
    },

    /* Pending co-author invite banner */
    inviteBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.card2,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
    },
    inviteTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    inviteSub: {
      fontSize: 12,
      fontWeight: '400',
      color: tokens.colors.mute,
      marginTop: 2,
    },
    inviteActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    declineBtn: {
      height: 34,
      paddingHorizontal: 14,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.line,
    },
    declineText: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.colors.mute,
    },
    acceptBtn: {
      height: 34,
      paddingHorizontal: 16,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.colors.inverseBg,
    },
    acceptText: {
      fontSize: 13,
      fontWeight: '700',
      color: tokens.colors.inverseFg,
    },

    /* Title */
    titleBlock: {
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    titleArtist: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: tokens.colors.fg,
      lineHeight: 25,
    },
    titleMeta: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 0.2,
      color: tokens.colors.mute,
      marginTop: 5,
    },

    /* Metadata strip */
    metaStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 30,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.full,
      backgroundColor: tokens.colors.card2,
    },
    chipText: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 0.2,
      color: tokens.colors.mute,
    },

    /* Note */
    noteBlock: {
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    noteText: {
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 21,
      color: tokens.colors.text,
    },
    noteUser: {
      fontWeight: '700',
      color: tokens.colors.fg,
    },

    /* Comments */
    commentsBlock: {
      paddingHorizontal: 16,
      paddingTop: 18,
      gap: 14,
    },
    commentsHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.colors.mute,
    },
    commentRow: {
      flexDirection: 'row',
      gap: 10,
    },
    commentBody: {
      flex: 1,
    },
    commentText: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 19,
      color: tokens.colors.textSoft,
    },
    commentUser: {
      fontWeight: '600',
      color: tokens.colors.fg,
    },
    commentTime: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.4,
      color: tokens.colors.muteSoft,
      marginTop: 3,
    },
    commentsEmpty: {
      fontSize: 14,
      fontWeight: '400',
      color: tokens.colors.muteSoft,
    },

    /* Skeleton */
    skeletonHero: {
      width: '100%',
      aspectRatio: 5 / 4,
      backgroundColor: tokens.colors.card2,
    },
    skeletonLineLg: {
      width: '60%',
      height: 22,
      borderRadius: 6,
      backgroundColor: tokens.colors.card2,
    },
    skeletonLineSm: {
      width: '40%',
      height: 12,
      borderRadius: 4,
      backgroundColor: tokens.colors.card2,
    },
    skeletonChip: {
      width: 70,
      height: 30,
      borderRadius: 999,
      backgroundColor: tokens.colors.card2,
    },
  });
