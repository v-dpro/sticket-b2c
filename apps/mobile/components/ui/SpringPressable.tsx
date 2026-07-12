// SpringPressable — spec tap feedback (INTERACTIONS.md):
//   tap down  → scale(0.97) over 80ms ease-out
//   release   → spring back (stiffness 260, damping 20)
//   disabled  → useShake() jitter + error haptic instead of onPress
// All transforms run as Reanimated worklets on the UI thread.

import { type ReactNode, useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics, motionDurations, springs, useShake } from '../../lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticKind = 'light' | 'medium' | 'heavy' | 'none';

type SpringPressableProps = Omit<PressableProps, 'style' | 'disabled'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Default 0.97 per spec. */
  pressScale?: number;
  /**
   * Haptic fired on press. Default 'light' — every tap ticks (app-wide
   * interactivity default). Pass 'none' to opt out (e.g. when the onPress
   * handler fires its own tiered haptic) or a heavier tier per the table.
   */
  haptic?: HapticKind;
  disabled?: boolean;
  /** When disabled, taps shake instead of being swallowed. Default true. */
  shakeWhenDisabled?: boolean;
};

export function SpringPressable({
  children,
  style,
  pressScale = 0.97,
  haptic = 'light',
  disabled = false,
  shakeWhenDisabled = true,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: SpringPressableProps) {
  const scale = useSharedValue(1);
  const { shakeStyle, shake } = useShake();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withTiming(pressScale, {
          duration: motionDurations.pressDown,
          easing: Easing.out(Easing.ease),
        });
      }
      onPressIn?.(e);
    },
    [disabled, onPressIn, pressScale, scale],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(1, springs.press);
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) {
        if (shakeWhenDisabled) shake();
        return;
      }
      if (haptic !== 'none') haptics[haptic]();
      onPress?.(e);
    },
    [disabled, haptic, onPress, shake, shakeWhenDisabled],
  );

  return (
    <AnimatedPressable
      {...rest}
      // Keep pressable enabled while "disabled" so taps can trigger the shake.
      disabled={disabled && !shakeWhenDisabled}
      accessibilityState={{ disabled }}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled ? shakeStyle : undefined]}
    >
      {children}
    </AnimatedPressable>
  );
}
