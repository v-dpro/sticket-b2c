// FloatCard — scroll-linked "float" wrapper for timeline cards.
//
// As a card approaches the viewport's vertical center it settles: scale
// 0.97 → 1 and opacity 0.5 → 1 (subtle amplitude by design). All per-frame
// work happens in a Reanimated worklet on the UI thread:
//
//   1. The screen's useAnimatedScrollHandler writes contentOffset.y into a
//      shared value (`scrollY`).
//   2. Each wrapper's useAnimatedStyle worklet reads `scrollY.value` (which
//      makes it re-evaluate every scroll frame) and calls Reanimated's
//      `measure()` on its own view — UI-thread-only, cheap, and already
//      inclusive of the scroll translation, so `pageY + height/2` is the
//      card's live window-space center.
//   3. Distance from the window center, normalized to half the window
//      height, drives two clamped interpolations. Pure worklet math — no
//      JS-thread work per frame.
//
// `measure()` is only valid on the UI runtime; the `_WORKLET` guard returns
// the settled style for the initial JS-side style evaluation (and on web).

import React, { type ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

type FloatCardProps = {
  /** The list's scroll offset shared value — drives per-frame updates. */
  scrollY: SharedValue<number>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const SETTLED: { opacity: number; transform: [{ scale: number }] } = {
  opacity: 1,
  transform: [{ scale: 1 }],
};

export function FloatCard({ scrollY, children, style }: FloatCardProps) {
  // Default ref type (React.Component) — satisfies measure()'s WrapperRef
  // constraint and attaches cleanly to Animated.View under Reanimated 4.
  const aref = useAnimatedRef();
  const { height: windowHeight } = useWindowDimensions();

  const floatStyle = useAnimatedStyle(() => {
    // Read scrollY so this worklet re-runs on every scroll frame.
    const offset = scrollY.value;
    void offset;

    // useAnimatedStyle's first evaluation runs on the JS runtime, where
    // measure() is unavailable — render settled until the UI thread takes over.
    if (!_WORKLET) return SETTLED;

    const m = measure(aref);
    if (m === null) return SETTLED;

    const viewportCenter = windowHeight / 2;
    const cardCenter = m.pageY + m.height / 2;
    // 0 at viewport center → 1 at the window edge (can exceed 1 offscreen).
    const distance = Math.abs(cardCenter - viewportCenter) / viewportCenter;

    return {
      opacity: interpolate(distance, [0, 0.55, 1.15], [1, 1, 0.5], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(distance, [0, 0.45, 1.15], [1, 1, 0.97], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    // collapsable={false} keeps the view measurable on Android.
    <Animated.View ref={aref} collapsable={false} style={[style, floatStyle]}>
      {children}
    </Animated.View>
  );
}
