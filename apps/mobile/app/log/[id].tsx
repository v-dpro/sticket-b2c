import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '../../components/ui/Screen';
import { colors, accentSets, radius, fonts, fontFamilies } from '../../lib/theme';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { Avatar } from '../../components/ui/Avatar';
import { useLogDetail } from '../../hooks/useLogDetail';
import { ShareButton } from '../../components/share/ShareButton';
import { createLogLink } from '../../lib/share/deepLinks';
import type { ShareCardData } from '../../types/share';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_HEIGHT = SCREEN_WIDTH * (5 / 4); // 4:5 aspect ratio
const HEADER_HEIGHT = 52;

// ─── Rating stars helper ──────────────────────────────
function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
        size={size}
        color={colors.gold}
        style={{ marginRight: 1 }}
      />
    );
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
}

// ─── Relative time helper ─────────────────────────────
function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

// ─── Format event date ────────────────────────────────
function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LogDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, loading, refreshing, error, refresh, submitComment, toggleWasThere } = useLogDetail(id || '');

  // Scroll tracking
  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrolled, setScrolled] = useState(false);

  // Media pager state
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Likes animation
  const heartScale = useRef(new Animated.Value(1)).current;

  // Who was here expansion
  const [whoExpanded, setWhoExpanded] = useState(false);

  // Setlist spoiler
  const [setlistRevealed, setSetlistRevealed] = useState(false);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const shareCardData = useMemo<ShareCardData | null>(() => {
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

  // ─── Scroll handler ──────────────────────────────────
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        setScrolled(y > 40);
      },
    }
  );

  // Header animated values
  const headerBg = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: ['rgba(11,11,20,0)', 'rgba(11,11,20,0.92)'],
    extrapolate: 'clamp',
  });
  const headerBorder = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: ['rgba(36,36,51,0)', 'rgba(36,36,51,1)'],
    extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 80, 140],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // ─── Heart animation ─────────────────────────────────
  const handleHeartPress = useCallback(() => {
    if (!data) return;
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }),
    ]).start();
    void toggleWasThere(data.userWasThere);
  }, [data, heartScale, toggleWasThere]);

  // ─── Comment submit ───────────────────────────────────
  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      await submitComment(commentText.trim());
      setCommentText('');
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentText, commentSubmitting, submitComment]);

  // ─── Media scroll handler ─────────────────────────────
  const handleMediaScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveMediaIndex(idx);
  }, []);

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
          <Text style={styles.mutedText}>Loading log...</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.mutedText, { textAlign: 'center' }]}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : !data ? null : (
        <View style={{ flex: 1, backgroundColor: colors.ink }}>

          {/* ═══ 2. SCROLL-AWARE HEADER ═══ */}
          <Animated.View
            style={[
              styles.header,
              {
                paddingTop: insets.top,
                height: HEADER_HEIGHT + insets.top,
                backgroundColor: headerBg,
                borderBottomColor: headerBorder,
                borderBottomWidth: 1,
              },
            ]}
          >
            {/* Back button */}
            <Pressable
              style={[
                styles.headerCircle,
                { backgroundColor: scrolled ? 'transparent' : 'rgba(0,0,0,0.35)' },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textHi} />
            </Pressable>

            {/* Center: artist name fades in */}
            <Animated.Text
              style={[styles.headerTitle, { opacity: titleOpacity }]}
              numberOfLines={1}
            >
              {data.event.artist.name}
            </Animated.Text>

            {/* Share button */}
            {shareCardData ? (
              <ShareButton
                data={shareCardData}
                link={createLogLink(String(id || ''))}
                renderTrigger={(onPress) => (
                  <Pressable
                    style={[
                      styles.headerCircle,
                      { backgroundColor: scrolled ? 'transparent' : 'rgba(0,0,0,0.35)' },
                    ]}
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityLabel="Share"
                  >
                    <Ionicons name="paper-plane-outline" size={18} color={colors.textHi} />
                  </Pressable>
                )}
              />
            ) : (
              <View style={styles.headerCircle} />
            )}
          </Animated.View>

          {/* ═══ SCROLLABLE CONTENT ═══ */}
          <Animated.ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.brandPurple}
                colors={[colors.brandPurple]}
                progressViewOffset={HEADER_HEIGHT + insets.top}
              />
            }
          >

            {/* ═══ 3. POST HEADER ═══ */}
            <View style={[styles.postHeader, { paddingTop: HEADER_HEIGHT + insets.top + 12 }]}>
              <View style={styles.postHeaderRow}>
                <Pressable
                  style={styles.postHeaderUser}
                  onPress={() => router.push({ pathname: '/profile/[id]', params: { id: data.user.id } })}
                >
                  <Avatar uri={data.user.avatarUrl} name={data.user.displayName || data.user.username} size={36} />
                  <View style={{ marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.postUsername}>
                        {data.user.displayName || data.user.username}
                      </Text>
                      <MonoLabel size={10.5} color={accentSets.cyan.hex} style={{ letterSpacing: 1 }}>
                        LOGGED A SHOW
                      </MonoLabel>
                    </View>
                    <Text style={styles.postMeta}>
                      {data.event.venue.name} {'\u00B7'} {formatDate(data.event.date)}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* ═══ 4. MEDIA SECTION ═══ */}
            {data.log.photos?.length ? (
              <View style={styles.mediaContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleMediaScroll}
                  decelerationRate="fast"
                  snapToInterval={SCREEN_WIDTH}
                >
                  {data.log.photos.map((photo, i) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photo.photoUrl }}
                      style={{ width: SCREEN_WIDTH, height: MEDIA_HEIGHT }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                {/* Counter pill */}
                {data.log.photos.length > 1 && (
                  <View style={styles.counterPill}>
                    <Text style={styles.counterText}>
                      {activeMediaIndex + 1}/{data.log.photos.length}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              /* Fallback: artist image or gradient placeholder */
              <View style={styles.mediaContainer}>
                {data.event.artist.imageUrl ? (
                  <Image
                    source={{ uri: data.event.artist.imageUrl }}
                    style={{ width: SCREEN_WIDTH, height: MEDIA_HEIGHT }}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.surface, colors.ink]}
                    style={{ width: SCREEN_WIDTH, height: MEDIA_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Ionicons name="musical-notes" size={64} color={colors.textMuted} />
                  </LinearGradient>
                )}
              </View>
            )}

            {/* ═══ 5. ACTION ROW ═══ */}
            <View style={styles.actionRow}>
              {/* Heart / Was There */}
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Pressable onPress={handleHeartPress} accessibilityRole="button" accessibilityLabel="Like">
                  <Ionicons
                    name={data.userWasThere ? 'heart' : 'heart-outline'}
                    size={26}
                    color={data.userWasThere ? colors.red : colors.textHi}
                  />
                </Pressable>
              </Animated.View>

              {/* Comment */}
              <Pressable accessibilityRole="button" accessibilityLabel="Comment" style={{ marginLeft: 14 }}>
                <Ionicons name="chatbubble-outline" size={24} color={colors.textHi} />
              </Pressable>

              {/* Share */}
              {shareCardData ? (
                <ShareButton
                  data={shareCardData}
                  link={createLogLink(String(id || ''))}
                  renderTrigger={(onPress) => (
                    <Pressable onPress={onPress} style={{ marginLeft: 14 }} accessibilityRole="button" accessibilityLabel="Share">
                      <Ionicons name="paper-plane-outline" size={22} color={colors.textHi} />
                    </Pressable>
                  )}
                />
              ) : (
                <Pressable style={{ marginLeft: 14 }}>
                  <Ionicons name="paper-plane-outline" size={22} color={colors.textHi} />
                </Pressable>
              )}

              <View style={{ flex: 1 }} />

              {/* Media dots */}
              {data.log.photos && data.log.photos.length > 1 && (
                <View style={styles.mediaDots}>
                  {data.log.photos.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.mediaDot,
                        i === activeMediaIndex && styles.mediaDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}

              <View style={{ flex: 1 }} />

              {/* Bookmark */}
              <Pressable accessibilityRole="button" accessibilityLabel="Save">
                <Ionicons name="bookmark-outline" size={22} color={colors.textHi} />
              </Pressable>
            </View>

            {/* ═══ 6. LIKES ROW ═══ */}
            {data.wasThereCount > 0 && (
              <View style={styles.likesRow}>
                {/* Avatar stack for who was there */}
                {data.othersWhoWent?.slice(0, 3).map((person, i) => (
                  <View
                    key={person.id}
                    style={[
                      styles.likesAvatarWrap,
                      i > 0 && { marginLeft: -8 },
                      { zIndex: 3 - i },
                    ]}
                  >
                    <Avatar uri={person.avatarUrl} name={person.username} size={22} style={{ borderWidth: 2, borderColor: colors.ink }} />
                  </View>
                ))}
                <Text style={styles.likesText}>
                  {data.othersWhoWent?.length
                    ? <>Liked by <Text style={{ fontFamily: fontFamilies.uiBold }}>@{data.othersWhoWent[0].username}</Text>{data.wasThereCount > 1 ? ` and ${data.wasThereCount - 1} others` : ''}</>
                    : `${data.wasThereCount} ${data.wasThereCount === 1 ? 'like' : 'likes'}`
                  }
                </Text>
              </View>
            )}

            {/* ═══ 7. CAPTION ═══ */}
            <View style={styles.caption}>
              {/* Artist name - display style */}
              <Pressable onPress={() => router.push({ pathname: '/artist/[artistId]', params: { artistId: data.event.artist.id } })}>
                <Text style={styles.captionArtist}>{data.event.artist.name}</Text>
              </Pressable>

              {/* Tour + rating */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {data.event.name && data.event.name !== data.event.artist.name && (
                  <MonoLabel size={10.5} color={colors.textLo} style={{ letterSpacing: 1.5 }}>
                    {data.event.name.toUpperCase()}
                  </MonoLabel>
                )}
                {data.log.rating != null && data.log.rating > 0 && (
                  <RatingStars rating={data.log.rating} size={12} />
                )}
              </View>

              {/* Review text */}
              {data.log.note ? (
                <Text style={styles.captionText}>
                  <Text style={styles.captionBoldUser}>@{data.user.username}</Text>
                  {'  '}{data.log.note}
                </Text>
              ) : null}
            </View>

            {/* ═══ 8. WHO WAS HERE ═══ */}
            {data.othersWhoWent && data.othersWhoWent.length > 0 && (
              <View style={styles.whoWasHere}>
                <Pressable
                  style={styles.whoCollapsed}
                  onPress={() => setWhoExpanded(!whoExpanded)}
                  accessibilityRole="button"
                >
                  {/* Avatar stack */}
                  <View style={{ flexDirection: 'row', marginRight: 8 }}>
                    {data.othersWhoWent.slice(0, 3).map((p, i) => (
                      <View key={p.id} style={[i > 0 && { marginLeft: -8 }, { zIndex: 3 - i }]}>
                        <Avatar uri={p.avatarUrl} name={p.username} size={24} style={{ borderWidth: 2, borderColor: colors.surface }} />
                      </View>
                    ))}
                  </View>
                  <Text style={styles.whoText} numberOfLines={1}>
                    <Text style={{ fontFamily: fontFamilies.uiSemi }}>@{data.othersWhoWent[0].username}</Text>
                    {data.othersWhoWent.length > 1
                      ? ` + ${data.othersWhoWent.length - 1} ${data.othersWhoWent.length - 1 === 1 ? 'friend' : 'friends'} also went`
                      : ' also went'}
                  </Text>
                  <Ionicons
                    name={whoExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textLo}
                    style={{ marginLeft: 'auto' }}
                  />
                </Pressable>

                {whoExpanded && (
                  <View style={styles.whoExpandedList}>
                    {data.othersWhoWent.map((person) => (
                      <Pressable
                        key={person.id}
                        style={styles.whoPersonRow}
                        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: person.id } })}
                      >
                        <Avatar uri={person.avatarUrl} name={person.username} size={30} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.whoPersonName}>@{person.username}</Text>
                          {person.rating != null && person.rating > 0 && (
                            <RatingStars rating={person.rating} size={10} />
                          )}
                        </View>
                        <Pressable style={styles.whoFollowBtn}>
                          <MonoLabel size={9.5} color={colors.textLo}>
                            FOLLOWING
                          </MonoLabel>
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ═══ 9. COMMENTS ═══ */}
            <View style={styles.comments}>
              {data.commentCount > 0 && data.allComments && data.allComments.length < data.commentCount && (
                <Pressable style={{ marginBottom: 8 }}>
                  <Text style={styles.viewAllComments}>
                    View all {data.commentCount} comments
                  </Text>
                </Pressable>
              )}

              {(data.allComments ?? data.comments)?.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Avatar uri={c.user.avatarUrl} name={c.user.displayName || c.user.username} size={28} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.commentBody}>
                      <Text style={styles.commentBoldUser}>@{c.user.username}</Text>
                      {'  '}{c.text}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                      <Text style={styles.commentMeta}>{timeAgo(c.createdAt)}</Text>
                      <Pressable>
                        <Text style={styles.commentMeta}>Reply</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Pressable style={{ paddingLeft: 8, paddingTop: 4 }}>
                    <Ionicons name="heart-outline" size={12} color={colors.textLo} />
                  </Pressable>
                </View>
              ))}

              {(!data.allComments || data.allComments.length === 0) && (!data.comments || data.comments.length === 0) && (
                <Text style={styles.mutedText}>No comments yet.</Text>
              )}
            </View>

            {/* ═══ 10. SETLIST (behind SpoilerBox) ═══ */}
            <View style={styles.setlistSection}>
              <MonoLabel size={11} color={colors.textLo} style={{ letterSpacing: 1.5, marginBottom: 10 }}>
                {'SETLIST \u00B7 -- SONGS'}
              </MonoLabel>

              {!setlistRevealed ? (
                <Pressable
                  style={styles.spoilerBox}
                  onPress={() => setSetlistRevealed(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Reveal setlist"
                >
                  <Ionicons name="eye-off-outline" size={22} color={colors.textLo} />
                  <Text style={styles.spoilerText}>Tap to reveal setlist</Text>
                  <MonoLabel size={9.5} color={colors.textMuted}>
                    SPOILER WARNING
                  </MonoLabel>
                </Pressable>
              ) : (
                <View style={styles.setlistCard}>
                  <Text style={styles.setlistPlaceholder}>Setlist data coming soon</Text>
                </View>
              )}
            </View>

            {/* ═══ 11. TIPS ═══ */}
            <View style={styles.tipsSection}>
              <MonoLabel size={11} color={colors.textLo} style={{ letterSpacing: 1.5, marginBottom: 10 }}>
                TIPS
              </MonoLabel>
              <View style={styles.tipCard}>
                <Ionicons name="flash" size={16} color={accentSets.cyan.hex} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.tipText}>
                  {data.log.section
                    ? `Section ${data.log.section}${data.log.row ? `, Row ${data.log.row}` : ''}${data.log.seat ? `, Seat ${data.log.seat}` : ''}`
                    : 'No seating tips yet. Be the first to share!'}
                </Text>
              </View>
            </View>

            {/* ═══ 12. RELATED CHIPS ═══ */}
            <View style={styles.relatedSection}>
              <MonoLabel size={11} color={colors.textLo} style={{ letterSpacing: 1.5, marginBottom: 10 }}>
                ALSO SEE
              </MonoLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {/* Artist chip */}
                <Pressable
                  style={styles.relatedChip}
                  onPress={() => router.push({ pathname: '/artist/[artistId]', params: { artistId: data.event.artist.id } })}
                >
                  {data.event.artist.imageUrl ? (
                    <Image source={{ uri: data.event.artist.imageUrl }} style={styles.relatedChipAvatar} />
                  ) : (
                    <LinearGradient
                      colors={[accentSets.purple.hex, accentSets.cyan.hex]}
                      style={styles.relatedChipAvatar}
                    />
                  )}
                  <Text style={styles.relatedChipText}>{data.event.artist.name}</Text>
                </Pressable>

                <Text style={styles.relatedDot}>{'\u00B7'}</Text>

                {/* Venue chip */}
                <Pressable
                  style={styles.relatedChipBadge}
                  onPress={() => router.push({ pathname: '/venue/[venueId]', params: { venueId: data.event.venue.id } })}
                >
                  <Text style={styles.relatedChipBadgeText}>{data.event.venue.name}</Text>
                </Pressable>

                <Text style={styles.relatedDot}>{'\u00B7'}</Text>

                {/* Event chip */}
                <Pressable
                  style={styles.relatedChipBadge}
                  onPress={() => router.push({ pathname: '/event/[eventId]', params: { eventId: data.event.id } })}
                >
                  <Text style={styles.relatedChipBadgeText}>{data.event.name}</Text>
                </Pressable>
              </ScrollView>
            </View>

          </Animated.ScrollView>

          {/* ═══ 13. PINNED COMMENT COMPOSER ═══ */}
          <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Avatar uri={data.user.avatarUrl} name={data.user.displayName || data.user.username} size={30} />
            <TextInput
              style={styles.composerInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textLo}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleCommentSubmit}
              disabled={!commentText.trim() || commentSubmitting}
              accessibilityRole="button"
            >
              {commentSubmitting ? (
                <ActivityIndicator size="small" color={accentSets.cyan.hex} />
              ) : (
                <Text style={[styles.composerPost, commentText.trim() ? styles.composerPostActive : null]}>
                  Post
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

// ─── STYLES ─────────────────────────────────────────────
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  mutedText: {
    color: colors.textMid,
    fontSize: 13,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  retryText: {
    color: colors.textHi,
    fontWeight: '800',
  },

  // ─── 2. Header ────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textHi,
    fontSize: 13,
    fontFamily: fontFamilies.uiBold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  // ─── 3. Post header ───────────────────────────────────
  postHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postUsername: {
    color: colors.textHi,
    fontSize: 14,
    fontFamily: fontFamilies.uiBold,
  },
  postMeta: {
    color: colors.textMid,
    fontSize: 12,
    fontFamily: fontFamilies.ui,
    marginTop: 2,
  },

  // ─── 4. Media ─────────────────────────────────────────
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  counterPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    // Frosted glass approximation
    ...(Platform.OS === 'ios' ? {} : {}),
  },
  counterText: {
    color: colors.textHi,
    fontSize: 11,
    fontFamily: fontFamilies.monoSemi,
  },

  // ─── 5. Action row ────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  mediaDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  mediaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textMuted,
  },
  mediaDotActive: {
    backgroundColor: accentSets.cyan.hex,
  },

  // ─── 6. Likes row ─────────────────────────────────────
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  likesAvatarWrap: {
    // individual avatar in stack
  },
  likesText: {
    color: colors.textHi,
    fontSize: 13,
    fontFamily: fontFamilies.ui,
    marginLeft: 6,
  },

  // ─── 7. Caption ───────────────────────────────────────
  caption: {
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  captionArtist: {
    color: colors.textHi,
    fontSize: 28,
    fontFamily: fontFamilies.displayItalic,
    letterSpacing: -0.6,
    lineHeight: 28 * 1.1,
  },
  captionText: {
    color: colors.textHi,
    fontSize: 14,
    fontFamily: fontFamilies.ui,
    lineHeight: 14 * 1.45,
    marginTop: 6,
  },
  captionBoldUser: {
    fontFamily: fontFamilies.uiBold,
    color: colors.textHi,
  },

  // ─── 8. Who was here ──────────────────────────────────
  whoWasHere: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  whoCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  whoText: {
    color: colors.textHi,
    fontSize: 13,
    flex: 1,
  },
  whoExpandedList: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingVertical: 4,
  },
  whoPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  whoPersonName: {
    color: colors.textHi,
    fontSize: 13,
    fontFamily: fontFamilies.uiSemi,
  },
  whoFollowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  // ─── 9. Comments ──────────────────────────────────────
  comments: {
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  viewAllComments: {
    color: colors.textLo,
    fontSize: 13,
    fontFamily: fontFamilies.ui,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentBody: {
    color: colors.textHi,
    fontSize: 13.5,
    fontFamily: fontFamilies.ui,
    lineHeight: 13.5 * 1.4,
  },
  commentBoldUser: {
    fontFamily: fontFamilies.uiBold,
    color: colors.textHi,
  },
  commentMeta: {
    color: colors.textLo,
    fontSize: 10,
    fontFamily: fontFamilies.mono,
    textTransform: 'uppercase',
  },

  // ─── 10. Setlist ──────────────────────────────────────
  setlistSection: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  spoilerBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  spoilerText: {
    color: colors.textMid,
    fontSize: 14,
    fontFamily: fontFamilies.ui,
  },
  setlistCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: 16,
  },
  setlistPlaceholder: {
    color: colors.textLo,
    fontSize: 14,
    fontFamily: fontFamilies.ui,
    fontStyle: 'italic',
  },

  // ─── 11. Tips ─────────────────────────────────────────
  tipsSection: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  tipCard: {
    backgroundColor: accentSets.cyan.soft,
    borderWidth: 1,
    borderColor: accentSets.cyan.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    color: colors.textHi,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    flex: 1,
  },

  // ─── 12. Related chips ────────────────────────────────
  relatedSection: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  relatedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingRight: 12,
    paddingLeft: 3,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  relatedChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  relatedChipText: {
    color: colors.textHi,
    fontSize: 13.5,
    fontFamily: fontFamilies.uiSemi,
  },
  relatedChipBadge: {
    backgroundColor: accentSets.cyan.soft,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  relatedChipBadgeText: {
    color: accentSets.cyan.hex,
    fontSize: 13.5,
    fontFamily: fontFamilies.uiSemi,
  },
  relatedDot: {
    color: colors.textMuted,
    fontSize: 14,
    marginHorizontal: 2,
  },

  // ─── 13. Composer dock ────────────────────────────────
  composerDock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    color: colors.textHi,
    fontSize: 14,
    fontFamily: fontFamilies.ui,
    paddingVertical: 8,
    maxHeight: 80,
  },
  composerPost: {
    color: colors.textLo,
    fontSize: 13,
    fontFamily: fontFamilies.uiBold,
  },
  composerPostActive: {
    color: accentSets.cyan.hex,
  },
});
