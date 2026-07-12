// FeedCardPhotos — ShowCard media carousel.
//
// Default variant (memory screen /log/[id]): horizontal snap-swipe, mixed
// image + video, "n/m" counter pill top-right, dots centered below.
//
// Card variant (feed FeedCard v3, "the post is the photo"): the media is the
// whole card — pass `scrims`, `radius`, `dotsPosition="right"` (vertical dots
// hugging the right edge) and an `overlay` painted over the photo, with the
// counter suppressed. All carousel behavior (swipe, snap haptic, double-tap
// heart burst) is preserved verbatim across both variants.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
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
import { VideoView, useVideoPlayer } from 'expo-video';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { FeedPhoto } from '../../types/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics, motionDurations, springs } from '../../lib/motion';

const DOUBLE_TAP_MS = 260;

interface FeedCardPhotosProps {
  photos: FeedPhoto[];
  /** Single tap on media (open log detail). */
  onPressMedia: () => void;
  /** Double tap anywhere on media — like. Burst overlay renders here. */
  onDoubleTapLike: () => void;
  /** Media aspect ratio (height / width). Default 1 (square); hero = 5/4. */
  aspectRatio?: number;
  /** 'bottom' (default) = centered dots below; 'right' = vertical dots on the media's right edge (card v3). */
  dotsPosition?: 'bottom' | 'right';
  /** Show the "n/m" counter pill (default true). Card v3 suppresses it. */
  showCounter?: boolean;
  /** Paint top + bottom scrims over the media (card v3). */
  scrims?: boolean;
  /** Corner radius clipped on the media box (card v3). */
  radius?: number;
  /** Absolutely-positioned content painted over the media, beneath the burst. */
  overlay?: ReactNode;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FeedCardPhotos({
  photos,
  onPressMedia,
  onDoubleTapLike,
  aspectRatio = 1,
  dotsPosition = 'bottom',
  showCounter = true,
  scrims = false,
  radius = 0,
  overlay,
}: FeedCardPhotosProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapIndex = useRef(0);

  // Heart-burst overlay (double-tap): scale 0.6 → 1.4 → fade, 600ms.
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
      // Double tap — like + burst.
      lastTapRef.current = 0;
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      triggerBurst();
      onDoubleTapLike();
    } else {
      lastTapRef.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        onPressMedia();
      }, DOUBLE_TAP_MS + 30);
    }
  }, [onDoubleTapLike, onPressMedia, triggerBurst]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w && w !== width) setWidth(w);
    },
    [width],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const i = Math.max(
        0,
        Math.min(photos.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)),
      );
      if (i !== index) setIndex(i);
    },
    [index, photos.length, width],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const i = Math.max(
        0,
        Math.min(photos.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)),
      );
      if (i !== lastSnapIndex.current) {
        lastSnapIndex.current = i;
        haptics.light(); // carousel snap
      }
    },
    [photos.length, width],
  );

  const height = useMemo(() => Math.round(width * aspectRatio), [aspectRatio, width]);
  const count = photos.length;

  const handleDoubleTapLike = useCallback(() => {
    triggerBurst();
    onDoubleTapLike();
  }, [onDoubleTapLike, triggerBurst]);

  const renderItem = useCallback(
    ({ item, index: itemIndex }: { item: FeedPhoto; index: number }) => {
      if (item.mediaKind === 'video') {
        return (
          <VideoSlide
            item={item}
            width={width}
            height={height}
            active={itemIndex === index}
            onDoubleTap={handleDoubleTapLike}
          />
        );
      }
      return (
        <Pressable
          onPress={handleTap}
          style={{ width, height }}
          accessibilityRole="imagebutton"
          accessibilityLabel="Show photo. Double tap quickly to like."
        >
          <Image
            source={{ uri: item.thumbnailUrl || item.photoUrl }}
            style={styles.media}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={item.id}
          />
        </Pressable>
      );
    },
    [handleDoubleTapLike, handleTap, height, index, styles.media, width],
  );

  if (!count) return null;

  return (
    <View onLayout={onLayout}>
      <View
        style={[
          {
            width: width || '100%',
            height: width ? height : undefined,
            aspectRatio: width ? undefined : aspectRatio,
          },
          radius > 0 ? { borderRadius: radius, overflow: 'hidden' } : null,
        ]}
      >
        {width > 0 ? (
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            bounces
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            scrollEnabled={count > 1}
          />
        ) : (
          <View style={[styles.media, { backgroundColor: c.card2 }]} />
        )}

        {/* Scrims — top + bottom, so over-photo chrome stays legible (card v3) */}
        {scrims ? (
          <>
            <LinearGradient
              colors={['rgba(11,11,16,0.55)', 'transparent']}
              style={styles.scrimTop}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['transparent', 'rgba(11,11,16,0.92)']}
              style={styles.scrimBottom}
              pointerEvents="none"
            />
          </>
        ) : null}

        {/* Overlay — author pill / score chip / caption, painted over the photo */}
        {overlay ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {overlay}
          </View>
        ) : null}

        {/* Counter pill — top right (default variant) */}
        {showCounter && count > 1 ? (
          <View style={styles.counterPill} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1}/{count}
            </Text>
          </View>
        ) : null}

        {/* Vertical dots — right edge (card v3) */}
        {dotsPosition === 'right' && count > 1 ? (
          <View style={styles.dotsCol} pointerEvents="none">
            {photos.map((p, i) => (
              <View key={p.id} style={[styles.vDot, i === index && styles.vDotActive]} />
            ))}
          </View>
        ) : null}

        {/* Heart burst overlay */}
        <Animated.View style={[styles.burst, burstStyle]} pointerEvents="none">
          <Ionicons name="heart" size={96} color={c.error} />
        </Animated.View>
      </View>

      {/* Dots — below media (default variant) */}
      {dotsPosition === 'bottom' && count > 1 ? (
        <View style={styles.dotsRow} pointerEvents="none">
          {photos.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// One video slide: poster until first play, single tap toggles playback,
// double tap likes (burst rendered by the parent overlay), auto-pauses
// when swiped out of the active carousel position.
function VideoSlide({
  item,
  width,
  height,
  active,
  onDoubleTap,
}: {
  item: FeedPhoto;
  width: number;
  height: number;
  active: boolean;
  onDoubleTap: () => void;
}) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const lastTapRef = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(item.photoUrl, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (!active && playing) {
      player.pause();
      setPlaying(false);
    }
  }, [active, player, playing]);

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setStarted(true);
      setPlaying(true);
      haptics.light();
    }
  }, [player, playing]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      onDoubleTap();
    } else {
      lastTapRef.current = now;
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        togglePlayback();
      }, DOUBLE_TAP_MS + 30);
    }
  }, [onDoubleTap, togglePlayback]);

  const poster = item.thumbUrl || item.thumbnailUrl || item.photoUrl;

  return (
    <Pressable
      onPress={handleTap}
      style={{ width, height }}
      accessibilityRole="imagebutton"
      accessibilityLabel={
        playing ? 'Pause video. Double tap quickly to like.' : 'Play video. Double tap quickly to like.'
      }
    >
      <VideoView player={player} style={styles.media} contentFit="cover" nativeControls={false} />
      {!started ? (
        <Image
          source={{ uri: poster }}
          style={[StyleSheet.absoluteFill, styles.media]}
          contentFit="cover"
          transition={80}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
        />
      ) : null}
      {!playing ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playCircle}>
            <Ionicons name="play" size={26} color={c.fg} style={{ marginLeft: 3 }} />
          </View>
        </View>
      ) : null}
      {!playing ? (
        <View style={styles.durationBadge} pointerEvents="none">
          <Ionicons name="videocam" size={10} color={c.mute} />
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    media: {
      width: '100%',
      height: '100%',
      backgroundColor: tokens.colors.card2,
    },
    scrimTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '34%',
    },
    scrimBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '58%',
    },
    counterPill: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: tokens.colors.card2,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      borderRadius: tokens.radius.full,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    counterText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.8,
      color: tokens.colors.mute,
    },
    burst: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tokens.colors.card2,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationBadge: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: tokens.colors.card2,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      borderRadius: tokens.radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    durationText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 10,
      color: tokens.colors.mute,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
      paddingTop: 8,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: tokens.colors.line,
    },
    dotActive: {
      backgroundColor: tokens.colors.fg,
      width: 14,
    },
    // Vertical dots — right edge (card v3), white over the photo.
    dotsCol: {
      position: 'absolute',
      right: 10,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    vDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.45)',
    },
    vDotActive: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      height: 14,
    },
  });
