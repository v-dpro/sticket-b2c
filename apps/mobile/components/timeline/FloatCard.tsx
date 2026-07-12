// FloatCard — scroll-linked "carousel float" wrapper for timeline cards (A20).
//
// As a card approaches the viewport's vertical center it settles. Two curves,
// both driven by the same normalized distance:
//
//   d = min(|cardCenterY − viewportCenterY| / (viewportH × 0.62), 1)
//
//   curve="memory" — the carousel: the centered memory card reads DOMINANT,
//   neighbors visibly recede and squeeze toward it:
//     scale      = 1 − 0.09·d                     (min 0.91 at d = 1)
//     opacity    = 0.4 + 0.6·(1 − d)
//     translateY = −sign(cardCenterY − viewportCenterY)
//                    · 6 · max(0, (d − 0.5) / 0.5)
//                  (past d > 0.5 the card pulls up to 6px back toward the
//                   center — the parallax squeeze; 0 inside the half-zone)
//
//   curve="ambient" (default) — plan / compact rows, which travel BETWEEN
//   snap points and keep the original gentle float:
//     scale      = 1 − 0.045·d
//     opacity    = 0.55 + 0.45·(1 − d)
//     translateY = 0
//
// Transform + opacity ONLY, purely scroll-driven — it never fights
// momentum. All per-frame work happens in a Reanimated worklet on the UI
// thread:
//
//   1. The screen's useAnimatedScrollHandler writes contentOffset.y into a
//      shared value (`scrollY`).
//   2. Each wrapper's useAnimatedStyle worklet reads `scrollY.value` (which
//      makes it re-evaluate every scroll frame) and calls Reanimated's
//      `measure()` on its own view — UI-thread-only, cheap, and already
//      inclusive of the scroll translation, so `pageY + height/2` is the
//      card's live window-space center. (The ≤6px squeeze feeds back into
//      the next frame's measurement; the error it introduces in d is
//      ~0.01 — visually nil, so it isn't compensated.)
//   3. The formulas above are pure worklet math — no JS-thread work per frame.
//
// `measure()` is only valid on the UI runtime; the `_WORKLET` guard returns
// the settled style for the initial JS-side style evaluation (and on web).

import React, { type ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

export type FloatCurve = 'memory' | 'ambient';

type FloatCardProps = {
  /** The list's scroll offset shared value — drives per-frame updates. */
  scrollY: SharedValue<number>;
  /** 'memory' = strong carousel curve; 'ambient' (default) = gentle float. */
  curve?: FloatCurve;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const SETTLED: { opacity: number; transform: [{ translateY: number }, { scale: number }] } = {
  opacity: 1,
  transform: [{ translateY: 0 }, { scale: 1 }],
};

export function FloatCard({ scrollY, curve = 'ambient', children, style }: FloatCardProps) {
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
    const delta = cardCenter - viewportCenter;
    // d: 0 at viewport center → 1 at 62% of the viewport height away (clamped).
    const d = Math.min(Math.abs(delta) / (windowHeight * 0.62), 1);

    if (curve === 'memory') {
      // Parallax squeeze: beyond d > 0.5, pull up to 6px back toward center.
      const squeeze = 6 * Math.max(0, (d - 0.5) / 0.5);
      return {
        opacity: 0.4 + 0.6 * (1 - d),
        transform: [
          { translateY: delta > 0 ? -squeeze : squeeze },
          { scale: 1 - 0.09 * d },
        ],
      };
    }

    return {
      opacity: 0.55 + 0.45 * (1 - d),
      transform: [{ translateY: 0 }, { scale: 1 - 0.045 * d }],
    };
  });

  return (
    // collapsable={false} keeps the view measurable on Android.
    <Animated.View ref={aref} collapsable={false} style={[style, floatStyle]}>
      {children}
    </Animated.View>
  );
}
