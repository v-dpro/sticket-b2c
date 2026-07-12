// AnimatedSplash — the launch moment. The S is two tickets: the native
// splash hands off to this overlay showing the same logo, which then
// HEARTBEATS (two beats) and TEARS APART — each ticket flies out along
// its own diagonal, enlarging until it sweeps past the screen edge, and
// the app is revealed underneath. Reduced motion: a plain fade.
//
// Rendered above the app in the root layout until `done` fires.

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Matches app.json splash backgroundColor — the native splash blends in.
const SPLASH_BG = '#07001F';
const LOGO = 340;

type AnimatedSplashProps = {
  onDone: () => void;
};

export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const { width, height } = Dimensions.get('window');
  const flyX = width * 1.2;
  const flyY = height * 0.9;

  const scale = useSharedValue(1);
  const split = useSharedValue(0); // 0 = whole S · 1 = tickets gone
  const backdrop = useSharedValue(1);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      backdrop.value = withDelay(
        250,
        withTiming(0, { duration: 320 }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      );
      return;
    }
    // HEARTBEAT — two beats, the second harder (lub-DUB).
    scale.value = withSequence(
      withDelay(120, withTiming(1.06, { duration: 140, easing: Easing.out(Easing.quad) })),
      withTiming(1, { duration: 160, easing: Easing.in(Easing.quad) }),
      withTiming(1.12, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 170, easing: Easing.in(Easing.quad) }),
    );
    // THE TEAR — after the beats, the tickets take off.
    split.value = withDelay(
      760,
      withTiming(1, { duration: 620, easing: Easing.in(Easing.cubic) }),
    );
    backdrop.value = withDelay(
      1080,
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [reduced, scale, split, backdrop, onDone]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  // Top ticket exits up-right along the S diagonal; bottom mirrors it.
  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + split.value * 5) },
      { translateX: split.value * (flyX / (1 + split.value * 5)) },
      { translateY: -split.value * (flyY / (1 + split.value * 5)) },
      { rotate: `${split.value * 8}deg` },
    ],
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + split.value * 5) },
      { translateX: -split.value * (flyX / (1 + split.value * 5)) },
      { translateY: split.value * (flyY / (1 + split.value * 5)) },
      { rotate: `${split.value * 8}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: SPLASH_BG, zIndex: 9999 }, backdropStyle]}
    >
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        {reduced ? (
          <Image
            source={require('../../assets/splash-logo.png')}
            style={{ width: LOGO, height: LOGO }}
            contentFit="contain"
          />
        ) : (
          <View style={{ width: LOGO, height: LOGO }}>
            <Animated.View style={[StyleSheet.absoluteFillObject, bottomStyle]}>
              <Image
                source={require('../../assets/splash-ticket-bottom.png')}
                style={{ width: LOGO, height: LOGO }}
                contentFit="contain"
              />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFillObject, topStyle]}>
              <Image
                source={require('../../assets/splash-ticket-top.png')}
                style={{ width: LOGO, height: LOGO }}
                contentFit="contain"
              />
            </Animated.View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
