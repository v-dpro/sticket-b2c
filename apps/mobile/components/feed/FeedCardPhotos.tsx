// FeedCardPhotos — ShowCard media carousel (SCREENS.md §1.2):
// square 1:1, horizontal snap-swipe, mixed image + video, counter pill
// top-right ("2/5"), dots below, double-tap heart burst, light haptic
// on carousel snap.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VideoView, useVideoPlayer } from 'expo-video';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { FeedPhoto } from '../../types/feed';
import { colors, fontFamilies, radius } from '../../lib/theme';
import { haptics, motionDurations, springs } from '../../lib/motion';

const DOUBLE_TAP_MS = 260;

interface FeedCardPhotosProps {
  photos: FeedPhoto[];
  /** Single tap on media (open log detail). */
  onPressMedia: () => void;
  /** Double tap anywhere on media — like. Burst overlay renders here. */
  onDoubleTapLike: () => void;
  /** Media aspect ratio. Spec = 1 (square). */
  aspectRatio?: number;
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
}: FeedCardPhotosProps) {
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
            resizeMode="cover"
          />
        </Pressable>
      );
    },
    [handleDoubleTapLike, handleTap, height, index, width],
  );

  if (!count) return null;

  return (
    <View onLayout={onLayout}>
      <View style={{ width: width || '100%', height: width ? height : undefined, aspectRatio: width ? undefined : aspectRatio }}>
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
          <View style={[styles.media, { backgroundColor: colors.elevated }]} />
        )}

        {/* Counter pill — top right */}
        {count > 1 ? (
          <View style={styles.counterPill} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1}/{count}
            </Text>
          </View>
        ) : null}

        {/* Heart burst overlay */}
        <Animated.View style={[styles.burst, burstStyle]} pointerEvents="none">
          <Ionicons name="heart" size={96} color={colors.red} />
        </Animated.View>
      </View>

      {/* Dots — below media per spec */}
      {count > 1 ? (
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
        <Image source={{ uri: poster }} style={[StyleSheet.absoluteFill, styles.media]} resizeMode="cover" />
      ) : null}
      {!playing ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playCircle}>
            <Ionicons name="play" size={26} color={colors.white} style={{ marginLeft: 3 }} />
          </View>
        </View>
      ) : null}
      {!playing ? (
        <View style={styles.durationBadge} pointerEvents="none">
          <Ionicons name="videocam" size={10} color={colors.white} />
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.elevated,
  },
  counterPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(5,5,11,0.65)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textHi,
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
    backgroundColor: 'rgba(5,5,11,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
    backgroundColor: 'rgba(5,5,11,0.65)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10,
    color: colors.textHi,
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
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.brandCyan,
    width: 14,
  },
});
