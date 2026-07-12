// MemoryDeck — the timeline as a FIXED STAGE, not a scrolling page.
// The screen never scrolls: the centered card floats on its own surface
// (full scale, shadow, gentle idle bob) while neighbors recede behind it
// (scaled, dimmed, layered under). A vertical swipe drives the CARDS
// through the stage with spring physics — one flick, one card (fast
// flicks may carry a few) — and the fixed month readout above the stage
// ticks over as the centered card crosses month boundaries.
//
// Contract with you.tsx:
//   items      — chronological deck (future plans first, then past
//                entries newest→oldest), stable `key` per item (the map
//                view's fly-to targets these same keys).
//   onNearEnd  — fired when the centered card approaches the deck's tail
//                (pagination hook).
//   snapTo     — imperative jump (map marker fly-to) via ref.

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { TimelineEntry, TimelineUpcomingItem } from '../../lib/api/timeline';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export type DeckItem =
  | { kind: 'plan'; key: string; item: TimelineUpcomingItem; monthKey: string }
  | { kind: 'entry'; key: string; entry: TimelineEntry; monthKey: string };

export type MemoryDeckHandle = {
  /** Jump the stage to a deck index (map fly-to). */
  snapTo: (index: number, animated?: boolean) => void;
};

type MemoryDeckProps = {
  items: DeckItem[];
  /** Where the stage opens — usually the newest PAST entry. */
  initialIndex: number;
  renderCard: (item: DeckItem, isCentered: boolean) => React.ReactNode;
  /** Month readout text per item ("JUL 2026" / "UPCOMING · AUG 2026"). */
  readoutFor: (item: DeckItem) => string;
  onIndexChange?: (index: number) => void;
  onNearEnd?: () => void;
  /** Pull-down past the first card triggers this (deck's pull-to-refresh). */
  onOverscrollRefresh?: () => void;
};

// How many cards each side of center stay mounted (the rest render null).
const RENDER_WINDOW = 3;
// The farthest a single flick may carry, in cards.
const MAX_FLICK_CARRY = 4;
// Near-tail threshold for pagination.
const NEAR_END = 6;
// Spring for the settle — tight, no bounce past the neighbor.
const SETTLE_SPRING = { stiffness: 240, damping: 28, mass: 0.9 };

export const MemoryDeck = forwardRef<MemoryDeckHandle, MemoryDeckProps>(function MemoryDeck(
  { items, initialIndex, renderCard, readoutFor, onIndexChange, onNearEnd, onOverscrollRefresh },
  ref,
) {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardW = windowWidth - tokens.density.pad * 2;
  // Stride: how far one card-step moves the track. Derived from the memory
  // card's photo height so a full card always dominates the stage while the
  // previous/next peek close behind its edges.
  const stride = Math.round(cardW * 0.63 * 0.68);

  const count = items.length;
  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(Math.max(count - 1, 0), i)),
    [count],
  );

  const progress = useSharedValue(clampIndex(initialIndex));
  const dragStart = useSharedValue(0);
  // Idle bob — only the settled center card breathes (±3px, slow).
  const bob = useSharedValue(0);
  const [index, setIndex] = useState(clampIndex(initialIndex));
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [bob]);

  // Items shrank (refresh) — keep the stage inside the deck.
  useEffect(() => {
    if (indexRef.current > count - 1) {
      const clamped = clampIndex(indexRef.current);
      progress.value = clamped;
      setIndex(clamped);
    }
  }, [count, clampIndex, progress]);

  const settle = useCallback(
    (target: number) => {
      const prev = indexRef.current;
      if (target !== prev) {
        const prevMonth = items[prev]?.monthKey;
        const nextMonth = items[target]?.monthKey;
        // Crossing a month boundary lands harder than a card click.
        if (prevMonth && nextMonth && prevMonth !== nextMonth) haptics.medium();
        else haptics.light();
        setIndex(target);
        onIndexChange?.(target);
      }
      if (count > 0 && target >= count - NEAR_END) onNearEnd?.();
    },
    [items, count, onIndexChange, onNearEnd],
  );

  const triggerRefresh = useCallback(() => {
    if (onOverscrollRefresh) {
      haptics.medium();
      onOverscrollRefresh();
    }
  }, [onOverscrollRefresh]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Vertical intent only — the in-card photo pager owns horizontal.
        .activeOffsetY([-14, 14])
        .failOffsetX([-16, 16])
        .onStart(() => {
          cancelAnimation(progress);
          dragStart.value = progress.value;
        })
        .onUpdate((e) => {
          const raw = dragStart.value - e.translationY / stride;
          // Rubber-band past either end — the deck resists, never leaves.
          const max = Math.max(count - 1, 0);
          let next = raw;
          if (raw < 0) next = raw / (1 - raw * 2);
          else if (raw > max) {
            const over = raw - max;
            next = max + over / (1 + over * 2);
          }
          progress.value = next;
        })
        .onEnd((e) => {
          const max = Math.max(count - 1, 0);
          // Pulled down while already on the first card → refresh.
          if (dragStart.value <= 0 && progress.value < -0.28) {
            runOnJS(triggerRefresh)();
          }
          const velocity = -e.velocityY / stride; // cards/second
          let target = Math.round(progress.value + velocity * 0.16);
          target = Math.max(
            Math.round(dragStart.value) - MAX_FLICK_CARRY,
            Math.min(Math.round(dragStart.value) + MAX_FLICK_CARRY, target),
          );
          target = Math.max(0, Math.min(max, target));
          progress.value = withSpring(target, SETTLE_SPRING);
          runOnJS(settle)(target);
        }),
    [count, stride, progress, dragStart, settle, triggerRefresh],
  );

  useImperativeHandle(
    ref,
    () => ({
      snapTo: (i: number, animated = true) => {
        const target = clampIndex(i);
        cancelAnimation(progress);
        if (animated) progress.value = withSpring(target, SETTLE_SPRING);
        else progress.value = target;
        settle(target);
      },
    }),
    [clampIndex, progress, settle],
  );

  const styles = useThemedStyles((t) => ({
    root: { flex: 1 },
    readoutRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: 4,
      paddingBottom: 10,
    },
    readout: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2.5,
      color: t.colors.fg,
    },
    counter: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.mute,
    },
    stage: { flex: 1 },
    layer: {
      // Every card lives on a full-stage layer that centers it; the track
      // transform then slides the layer, so mixed card heights all pivot
      // around the same stage center. paddingBottom biases that center up
      // — the card should hang just above the true middle, not below it.
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: t.density.pad,
      right: t.density.pad,
      justifyContent: 'center',
      paddingBottom: 76,
    },
  }));

  const item = items[index];
  const readout = item ? readoutFor(item) : '';

  return (
    <View style={styles.root}>
      {/* Fixed readout — the date lives HERE and ticks as cards pass. */}
      <View style={styles.readoutRow}>
        {/* Key on the text: month changes re-enter with a small drop. */}
        <Animated.View key={readout} entering={FadeIn.duration(160)}>
          <Text style={styles.readout}>{readout}</Text>
        </Animated.View>
        <Text style={styles.counter}>
          {count > 0 ? `${index + 1} OF ${count}` : ''}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.stage} collapsable={false}>
          {items.map((deckItem, i) =>
            Math.abs(i - index) <= RENDER_WINDOW ? (
              <DeckLayer
                key={deckItem.key}
                index={i}
                progress={progress}
                bob={bob}
                stride={stride}
                interactive={i === index}
                layerStyle={styles.layer}
                shadowColor={tokens.shadows.elevated.shadowColor}
              >
                {renderCard(deckItem, i === index)}
              </DeckLayer>
            ) : null,
          )}
        </View>
      </GestureDetector>
    </View>
  );
});

type DeckLayerProps = {
  index: number;
  progress: SharedValue<number>;
  bob: SharedValue<number>;
  stride: number;
  interactive: boolean;
  layerStyle: object;
  shadowColor: string;
  children: React.ReactNode;
};

function DeckLayer({
  index,
  progress,
  bob,
  stride,
  interactive,
  layerStyle,
  shadowColor,
  children,
}: DeckLayerProps) {
  const animated = useAnimatedStyle(() => {
    const d = index - progress.value;
    const abs = Math.abs(d);
    // The idle bob only breathes when this card owns the center.
    const bobPx = interpolate(abs, [0, 0.25], [1, 0], 'clamp') * interpolate(bob.value, [0, 1], [2.5, -2.5]);
    return {
      transform: [
        { translateY: d * stride + bobPx },
        { scale: interpolate(abs, [0, 1, RENDER_WINDOW], [1, 0.94, 0.84], 'clamp') },
      ],
      // Neighbors sit just behind the floating card — dimmed enough to read
      // as a lower surface, close enough to feel like the same timeline.
      opacity: interpolate(abs, [0, 1, 2, RENDER_WINDOW], [1, 0.72, 0.38, 0.1], 'clamp'),
      zIndex: Math.round((RENDER_WINDOW + 1 - abs) * 10),
    };
  });

  // The floating surface: shadow belongs to the CENTER card only, and it
  // fades out as the card leaves the stage center.
  const surface = useAnimatedStyle(() => {
    const abs = Math.abs(index - progress.value);
    return {
      shadowOpacity: interpolate(abs, [0, 0.6], [0.34, 0], 'clamp'),
    };
  });

  return (
    <Animated.View
      style={[layerStyle, animated]}
      pointerEvents={interactive ? 'box-none' : 'none'}
    >
      <Animated.View
        style={[
          {
            shadowColor,
            shadowOffset: { width: 0, height: 14 },
            shadowRadius: 28,
            elevation: 12,
          },
          surface,
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
