// AnimatedSplash — a seamless takeover of the native splash. The overlay
// mounts IMMEDIATELY (it needs no fonts, no session), renders the SAME
// logo at the SAME geometry, and hides the native splash only once its
// own image has painted — no blank frame, no size jump. From that moment
// the logo BREATHES in a continuous 2% sine loop (never a static hold),
// and when the app behind is ready it settles to rest and fades out.
// (A richer hand-made animation will replace this later — this component
// is the slot for it.)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Matches app.json splash backgroundColor.
const SPLASH_BG = '#07001F';
// One half-breath (1 → 1.02). Full cycle = 2×.
const BREATH_MS = 780;
// The logo breathes at least this long even if the app is ready sooner —
// a fade that cuts in mid-first-breath reads as a glitch, not a beat.
const MIN_SHOW_MS = 1150;

type AnimatedSplashProps = {
  /** The app behind the overlay is mounted and safe to reveal. */
  ready: boolean;
  onDone: () => void;
};

export function AnimatedSplash({ ready, onDone }: AnimatedSplashProps) {
  const scale = useSharedValue(1);
  const backdrop = useSharedValue(1);
  const [painted, setPainted] = useState(false);
  const paintedAt = useRef(0);
  const leaving = useRef(false);

  // The overlay logo has PAINTED — the native splash can go; the pixels
  // underneath are identical, so the swap is invisible. Start breathing.
  const onLogoDisplay = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    paintedAt.current = Date.now();
    setPainted(true);
  }, []);

  useEffect(() => {
    if (!painted) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [painted, scale]);

  // App ready → let the current breath finish its beat, then settle + fade.
  useEffect(() => {
    if (!painted || !ready || leaving.current) return;
    leaving.current = true;
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - paintedAt.current));
    const timer = setTimeout(() => {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      backdrop.value = withTiming(
        0,
        { duration: 340, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      );
    }, wait);
    return () => clearTimeout(timer);
  }, [painted, ready, scale, backdrop, onDone]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: SPLASH_BG, zIndex: 9999 }, backdropStyle]}
    >
      <View style={StyleSheet.absoluteFillObject}>
        {/* Full-screen contain — the exact geometry the native splash uses. */}
        <Animated.View style={[StyleSheet.absoluteFillObject, logoStyle]}>
          <Image
            source={require('../../assets/splash-logo.png')}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            onDisplay={onLogoDisplay}
            cachePolicy="memory"
            priority="high"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
