// AnimatedSplash — the launch moment, kept quiet: the native splash hands
// off to this overlay showing the same S, which gives ONE subtle pulse and
// fades out to reveal the app. (A richer hand-made animation will replace
// the fade later — this component is the slot for it.)

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const scale = useSharedValue(1);
  const backdrop = useSharedValue(1);

  useEffect(() => {
    // ONE soft pulse — barely-there breath, not a heartbeat.
    scale.value = withSequence(
      withDelay(140, withTiming(1.035, { duration: 320, easing: Easing.out(Easing.sin) })),
      withTiming(1, { duration: 360, easing: Easing.inOut(Easing.sin) }),
    );
    // Then the whole overlay fades to reveal the app.
    backdrop.value = withDelay(
      780,
      withTiming(0, { duration: 340, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [scale, backdrop, onDone]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: SPLASH_BG, zIndex: 9999 }, backdropStyle]}
    >
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../assets/splash-logo.png')}
            style={{ width: LOGO, height: LOGO }}
            contentFit="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
