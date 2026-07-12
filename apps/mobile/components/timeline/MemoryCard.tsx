// MemoryCard — a shared log with a photo: the photo IS the memory (A19).
// Full-bleed image (height ≈ 63% of width), radius 22, bottom scrim; all
// text lives ON the photo: artist 21/800 white bottom-left, venue · date
// in uppercase letterspaced mono below it, score chip top-right (optional
// "#1 OF N" rank chip top-left), like/comment counts as a small mono line
// bottom-right inside the scrim. No caption furniture below the card.
//
// PHOTO PAGER — when the entry carries >1 photo the card becomes a mini
// carousel: a horizontal paging FlatList of the photos slides INSIDE the
// card frame while every overlay (scrim, chips, text, dots) lives in a
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
// The scrim and over-photo chip/dot colors are deliberately literal — they
// sit on top of a photo and are theme-independent by design (per the
// handoff; the "fg" of the over-photo world is always white).

import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { TimelineEntry, TimelinePhoto } from '../../lib/api/timeline';
import { haptics } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore, formatShortDate } from './format';

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

export function MemoryCard({ entry, onPress, rankLabel }: MemoryCardProps) {
  const styles = useThemedStyles((t) => ({
    card: {
      width: '100%',
      // Height ≈ 63% of width (~216pt at 340pt wide).
      aspectRatio: 100 / 63,
      borderRadius: t.radius.xl, // 22
      overflow: 'hidden',
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
    chip: {
      backgroundColor: CHIP_BG,
      borderWidth: 1,
      borderColor: CHIP_BORDER,
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    chipText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      fontWeight: '800',
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
  }));

  const photos = entry.photos as PagerPhoto[];
  const isPager = photos.length > 1;

  // ── Pager state ────────────────────────────────────────────────
  // Card width (measured — the paging unit), live page for the dots, and
  // the last settled page for the snap haptic.
  const [pageW, setPageW] = useState(0);
  const [page, setPage] = useState(0);
  const lastSnapPage = useRef(0);

  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
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
  const metaParts = [
    `${entry.venue.name} · ${formatShortDate(entry.event.date)}`,
    coAuthors || null,
  ].filter(Boolean);

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
      onLayout={onCardLayout}
    >
      {/* Photo layer — slides beneath the fixed overlay chrome. */}
      {isPager && pageW > 0 ? (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          nestedScrollEnabled
          onScroll={onPagerScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onPagerMomentumEnd}
          getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
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

      {/* Fixed overlay layer — scrim, chips, text, dots. pointerEvents="none"
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
          <View style={styles.chip}>
            <Text style={styles.chipText}>{rankLabel}</Text>
          </View>
        ) : (
          <View />
        )}
        {typeof entry.score === 'number' ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{formatScore(entry.score)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomBlock} pointerEvents="none">
        <Text style={styles.artist} numberOfLines={1}>
          {entry.artist.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {metaParts.join(' · ')}
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
      </View>

      {isPager ? (
        <View style={styles.dotsRow} pointerEvents="none">
          {photos.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </SpringPressable>
  );
}
