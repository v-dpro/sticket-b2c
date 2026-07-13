// AnimatedSplash — a seamless takeover of the native splash. The overlay
// renders the SAME logo at the SAME geometry (full-screen contain, same
// background), and only once the image has actually painted do we hide
// the native splash — no blank frame, no size jump. Then: one barely-there
// pulse, and a fade into the app. (A richer hand-made animation will
// replace this later — the component is the slot for it.)

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
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

// Matches app.json splash backgroundColor.
const SPLASH_BG = '#07001F';

type AnimatedSplashProps = {
  onDone: () => void;
};

export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const scale = useSharedValue(1);
  const backdrop = useSharedValue(1);
  const [painted, setPainted] = useState(false);

  // The overlay logo has PAINTED — now the native splash can go; the
  // pixels underneath are identical, so the swap is invisible.
  const onLogoDisplay = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    setPainted(true);
  }, []);

  useEffect(() => {
    if (!painted) return;
    // ONE whisper of a pulse — slow, sine-eased, 2% — then the fade.
    scale.value = withSequence(
      withDelay(120, withTiming(1.02, { duration: 420, easing: Easing.inOut(Easing.sin) })),
      withTiming(1, { duration: 460, easing: Easing.inOut(Easing.sin) }),
    );
    backdrop.value = withDelay(
      1060,
      withTiming(0, { duration: 340, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [painted, scale, backdrop, onDone]);

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
