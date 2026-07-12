// MemoryCard — a shared log with a photo. A logged memory IS a stub (C3):
// full-bleed photo on top (rounded by the card frame), then the stub
// construction on the card surface below — StubPerforation punching through
// to the stage bg, and a mono StubDetailsRow ("VENUE · JUL 11 2026" · "№ A1B2"
// from the log id). The score is a BareScore (C2 — bare giant digits ON the
// photo, no chip); artist 21/800 white on the bottom scrim; the optional
// "#1 OF N" rank renders as a bordered mono chip top-left. Card radius is
// radius.stub with a hairline border; total height = photo + details strip
// (the MemoryDeck accommodates mixed card heights).
//
// PHOTO PAGER — when the entry carries >1 photo the photo area becomes a mini
// carousel: a horizontal paging FlatList of the photos slides INSIDE the
// photo frame while every overlay (scrim, score, text, dots) lives in a
// fixed layer painted on top — photos move beneath, chrome never does.
// Tiny page dots sit bottom-center on the scrim (white active /
// rgba(255,255,255,.35) idle) and a light haptic fires on page snap.
// Horizontal paging nests orthogonally inside the vertical timeline
// carousel, so the pan never fights the outer scroll's momentum
// (directionalLockEnabled keeps diagonal drags honest). A single photo
// keeps the original static-image behavior.
//
// The card frame stays a SpringPressable: taps fall through the pager
// (a scroll view only claims the responder on move) so a tap anywhere
// still opens the log, while a horizontal drag cancels the press.
//
// The scrim and over-photo colors are deliberately literal — they sit on
// top of a photo and are theme-independent by design (per the handoff;
// the "fg" of the over-photo world is always white).

import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
// RNGH FlatList: registers its pan with the gesture system so horizontal
// photo paging works inside the deck's GestureDetector — with the RN one,
// the drag is never claimed and falls through to the card press.
import { FlatList } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { TimelineEntry, TimelinePhoto } from '../../lib/api/timeline';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BareScore, StubDetailsRow, StubPerforation } from '../ui/Stub';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore } from './format';

type MemoryCardProps = {
  entry: TimelineEntry;
  onPress: () => void;
  /**
   * "#1 OF 47" chip, top-left. Only pass a real rank (the screen computes it
   * from complete score data) — never fabricate one.
   */
  rankLabel?: string | null;
};

// The timeline API is growing photos[] (≤5 per entry, thumbnailUrl +
// mediaKind). Read mediaKind through this widening so the pager compiles
// both before and after the field lands on TimelinePhoto.
type PagerPhoto = TimelinePhoto & { mediaKind?: 'image' | 'video' };

// Over-photo constants (theme-independent — they overlay the image).
const SCRIM_COLORS = ['rgba(11,11,16,0)', 'rgba(11,11,16,0.88)'] as const;
const SCRIM_LOCATIONS = [0.4, 1] as const;
const OVERLAY_MUTE = '#C9C9D4';
const CHIP_BG = 'rgba(11,11,16,0.55)';
const CHIP_BORDER = 'rgba(255,255,255,0.16)';
const DOT_IDLE = 'rgba(255,255,255,0.35)';
const DOT_ACTIVE = '#FFFFFF'; // over-photo fg is always white (A19)

function coAuthorLabel(entry: TimelineEntry): string {
  const [first, ...rest] = entry.coAuthors;
  if (!first) return '';
  return rest.length > 0 ? `w/ @${first.username} +${rest.length}` : `w/ @${first.username}`;
}

/** ISO date → "Jul 11 2026" (the details row uppercases it). */
function stubDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .replace(',', '');
}

export function MemoryCard({ entry, onPress, rankLabel }: MemoryCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      width: '100%',
      borderRadius: t.radius.stub, // 14
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      overflow: 'hidden', // rounds the photo top AND clips the notch punches
      backgroundColor: t.colors.card,
    },
    // The photo area — keeps the old card proportions; the details strip
    // below grows the card, which the deck accommodates.
    photoArea: {
      width: '100%',
      aspectRatio: 100 / 63,
      backgroundColor: t.colors.card2, // shows while the photo loads
    },
    photo: {
      ...StyleSheet.absoluteFillObject,
    },
    slide: {
      height: '100%',
    },
    slidePhoto: {
      width: '100%',
      height: '100%',
    },
    playWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: CHIP_BG,
      borderWidth: 1,
      borderColor: CHIP_BORDER,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
    },
    topRow: {
      position: 'absolute',
      top: 12,
      left: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    // Rank chip — a flat ScoreStamp shape carrying text: bordered mono,
    // no fill (over-photo fg is white).
    rankChip: {
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      borderRadius: t.radius.chip, // 10
      paddingVertical: 4,
      paddingHorizontal: 9,
    },
    rankChipText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: '#FFFFFF',
    },
    bottomBlock: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 12,
    },
    artist: {
      fontSize: 21,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    meta: {
      flex: 1,
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: OVERLAY_MUTE,
    },
    counts: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    count: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    countText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      color: OVERLAY_MUTE,
    },
    // Page dots — tiny, bottom-center ON the scrim, beneath the text block.
    dotsRow: {
      position: 'absolute',
      bottom: 5,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: DOT_IDLE,
    },
    dotActive: {
      backgroundColor: DOT_ACTIVE,
    },
    detailsRow: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
    },
  }));

  const photos = entry.photos as PagerPhoto[];
  const isPager = photos.length > 1;

  // ── Pager state ────────────────────────────────────────────────
  // Photo-area width (measured — the paging unit; measured INSIDE the card
  // border so slides match the FlatList's own width exactly), live page for
  // the dots, and the last settled page for the snap haptic.
  const [pageW, setPageW] = useState(0);
  const [page, setPage] = useState(0);
  const lastSnapPage = useRef(0);

  const onPhotoAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setPageW((prev) => (w > 0 && Math.abs(w - prev) > 0.5 ? w : prev));
  }, []);

  const pageAt = useCallback(
    (x: number, w: number) => Math.max(0, Math.min(photos.length - 1, Math.round(x / w))),
    [photos.length],
  );

  // Dots track the drag live…
  const onPagerScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pageW) return;
      const i = pageAt(e.nativeEvent.contentOffset.x, pageW);
      setPage((prev) => (i === prev ? prev : i));
    },
    [pageAt, pageW],
  );

  // …the haptic waits for the settled snap.
  const onPagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pageW) return;
      const i = pageAt(e.nativeEvent.contentOffset.x, pageW);
      if (i !== lastSnapPage.current) {
        lastSnapPage.current = i;
        haptics.light(); // carousel snap
      }
    },
    [pageAt, pageW],
  );

  const renderSlide = useCallback(
    ({ item }: { item: PagerPhoto }) => (
      <View style={[styles.slide, { width: pageW }]}>
        <Image
          source={{ uri: item.thumbnailUrl || item.photoUrl }}
          style={styles.slidePhoto}
          contentFit="cover"
          transition={80}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
        />
        {item.mediaKind === 'video' ? (
          <View style={styles.playWrap} pointerEvents="none">
            <View style={styles.playCircle}>
              <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>
        ) : null}
      </View>
    ),
    [pageW, styles],
  );

  const photo = photos[0];
  const coAuthors = coAuthorLabel(entry);

  // Stub details — only segments that exist (timeline entries carry no
  // section/row today; tickets do — same row format when they land).
  const detailsLeft = [entry.venue.name, stubDate(entry.event.date)].filter(Boolean).join(' · ');
  const detailsRight = `№ ${entry.logId.slice(-4).toUpperCase()}`;

  const a11yParts = [
    `${entry.artist.name} at ${entry.venue.name}, shared memory`,
    isPager ? `${photos.length} photos, swipe sideways to browse` : null,
    typeof entry.score === 'number' ? `scored ${formatScore(entry.score)}` : null,
    rankLabel ? `ranked ${rankLabel.toLowerCase()}` : null,
  ].filter(Boolean);

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={a11yParts.join(', ')}
      style={styles.card}
    >
      <View style={styles.photoArea} onLayout={onPhotoAreaLayout}>
        {/* Photo layer — slides beneath the fixed overlay chrome. */}
        {isPager && pageW > 0 ? (
          <FlatList<TimelinePhoto>
            data={photos}
            keyExtractor={(p: TimelinePhoto) => p.id}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            directionalLockEnabled
            nestedScrollEnabled
            onScroll={onPagerScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onPagerMomentumEnd}
            getItemLayout={(_: unknown, i: number) => ({ length: pageW, offset: pageW * i, index: i })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            style={styles.photo}
          />
        ) : photo ? (
          <Image
            source={{ uri: photo.photoUrl || photo.thumbnailUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={photo.id}
          />
        ) : null}

        {/* Fixed overlay layer — scrim, score, text, dots. pointerEvents="none"
            throughout, so horizontal pans reach the pager beneath. */}
        {/* Bottom scrim: transparent until 40%, then settles to near-ink. */}
        <LinearGradient
          colors={SCRIM_COLORS}
          locations={SCRIM_LOCATIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.scrim}
          pointerEvents="none"
        />

        <View style={styles.topRow} pointerEvents="none">
          {rankLabel ? (
            <View style={styles.rankChip}>
              <Text style={styles.rankChipText}>{rankLabel}</Text>
            </View>
          ) : (
            <View />
          )}
          {/* C2: the score's ON-MEDIA body — bare giant digits, no chip. */}
          {typeof entry.score === 'number' ? <BareScore score={entry.score} size={34} /> : null}
        </View>

        <View style={styles.bottomBlock} pointerEvents="none">
          <Text style={styles.artist} numberOfLines={1}>
            {entry.artist.name}
          </Text>
          {coAuthors || entry.likeCount > 0 || entry.commentCount > 0 ? (
            <View style={styles.metaRow}>
              <Text style={styles.meta} numberOfLines={1}>
                {coAuthors}
              </Text>
              {entry.likeCount > 0 || entry.commentCount > 0 ? (
                <View style={styles.counts}>
                  {entry.likeCount > 0 ? (
                    <View style={styles.count}>
                      <Ionicons name="heart" size={11} color={OVERLAY_MUTE} />
                      <Text style={styles.countText}>{entry.likeCount}</Text>
                    </View>
                  ) : null}
                  {entry.commentCount > 0 ? (
                    <View style={styles.count}>
                      <Ionicons name="chatbubble" size={10} color={OVERLAY_MUTE} />
                      <Text style={styles.countText}>{entry.commentCount}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {isPager ? (
          <View style={styles.dotsRow} pointerEvents="none">
            {photos.map((p, i) => (
              <View key={p.id} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>

      {/* Stub construction (C3) — the tear line punches through to the
          stage bg the deck floats over; details in ticket mono below. */}
      <StubPerforation notchColor={tokens.colors.bg} style={{ marginTop: 4 }} />
      <StubDetailsRow left={detailsLeft} right={detailsRight} style={styles.detailsRow} />
    </SpringPressable>
  );
}
