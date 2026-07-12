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
  /** Text-only face for off-center positions — the full card only shows
      at center; before/after collapse to this label. */
  renderLabel: (item: DeckItem) => React.ReactNode;
  /** Month readout text per item ("JUL 2026" / "UPCOMING · AUG 2026"). */
  readoutFor: (item: DeckItem) => string;
  onIndexChange?: (index: number) => void;
  onNearEnd?: () => void;
  /** Pull-down past the first card triggers this (deck's pull-to-refresh). */
  onOverscrollRefresh?: () => void;
};

// How many cards each side of center stay mounted (the rest render null).
const RENDER_WINDOW = 2;
// The farthest a single flick may carry, in cards.
const MAX_FLICK_CARRY = 4;
// Near-tail threshold for pagination.
const NEAR_END = 6;
// Spring for the settle — tight, no bounce past the neighbor.
const SETTLE_SPRING = { stiffness: 240, damping: 28, mass: 0.9 };

export const MemoryDeck = forwardRef<MemoryDeckHandle, MemoryDeckProps>(function MemoryDeck(
  { items, initialIndex, renderCard, renderLabel, readoutFor, onIndexChange, onNearEnd, onOverscrollRefresh },
  ref,
) {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardW = windowWidth - tokens.density.pad * 2;
  // Stride: how far one card-step moves the track. Derived from the memory
  // card's photo height (stub cards run taller with the details strip) so a
  // full card dominates the stage while the previous/next peek behind it.
  const stride = Math.round(cardW * 0.63 * 0.8);

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
        // Tight thresholds: the horizontal-vs-vertical call happens fast so
        // the pager gets the drag before it reads as a press.
        .activeOffsetY([-10, 10])
        .failOffsetX([-12, 12])
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
          // SENSITIVE COMMIT: any deliberate gesture moves at least one
          // card — a third of a card of travel-plus-velocity is intent;
          // only a truly tiny nudge snaps back.
          const start = Math.round(dragStart.value);
          const velocity = -e.velocityY / stride; // cards/second
          const carried = progress.value - dragStart.value + velocity * 0.28;
          let target: number;
          if (Math.abs(carried) < 0.16) {
            target = start;
          } else {
            const steps = Math.max(1, Math.round(Math.abs(carried)));
            target = start + Math.sign(carried) * Math.min(steps, MAX_FLICK_CARRY);
          }
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
    // overflow hidden: receding cards must never escape the stage and
    // ghost under the fixed chrome above it (header / readout / toggle).
    stage: { flex: 1, overflow: 'hidden' },
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
                depth={i - index}
                progress={progress}
                bob={bob}
                stride={stride}
                interactive={i === index}
                layerStyle={styles.layer}
                shadow={tokens.shadows.stub}
                label={renderLabel(deckItem)}
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
  /** index − settled center index; static per render, sets the z-order. */
  depth: number;
  progress: SharedValue<number>;
  bob: SharedValue<number>;
  stride: number;
  interactive: boolean;
  layerStyle: object;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  /** Text-only face shown at off-center positions. */
  label: React.ReactNode;
  children: React.ReactNode;
};

function DeckLayer({
  index,
  depth,
  progress,
  bob,
  stride,
  interactive,
  layerStyle,
  shadow,
  label,
  children,
}: DeckLayerProps) {
  const animated = useAnimatedStyle(() => {
    const d = index - progress.value;
    const abs = Math.abs(d);
    // THE WHEEL. Cards are mounted on a drum you spin in place, not a
    // track that slides: each card sits at angle d·STEP on a circle whose
    // radius keeps the d=1 peek where it was tuned (stride at sin(STEP)).
    // translateY follows the arc (neighbors bunch toward the rim) and
    // rotateX tips each card back with perspective as it leaves center —
    // above-center tops tip away, below-center bottoms tip away.
    const STEP = 0.55; // radians of drum rotation per card
    const angle = Math.max(-1.3, Math.min(1.3, d * STEP));
    const radius = stride / Math.sin(STEP);
    // The idle bob only breathes when this card owns the center.
    const bobPx = interpolate(abs, [0, 0.25], [1, 0], 'clamp') * interpolate(bob.value, [0, 1], [2.5, -2.5]);
    return {
      transform: [
        { perspective: 900 },
        { translateY: radius * Math.sin(angle) + bobPx },
        { rotateX: `${-angle * 57.2958 * 0.52}deg` },
        { scale: interpolate(abs, [0, 1, RENDER_WINDOW], [1, 0.94, 0.84], 'clamp') },
      ],
      // A real card stack: the previous/next card stays FULLY readable —
      // depth comes from scale, position, and the center card's shadow,
      // never from dimming. Only the far cards fade as they leave.
      opacity: interpolate(abs, [0, 1, 1.6, RENDER_WINDOW], [1, 1, 0.75, 0.35], 'clamp'),
    };
  });

  // The FULL card lives only at center: it blooms in as the card arrives
  // and dissolves as it leaves…
  const cardFace = useAnimatedStyle(() => {
    const abs = Math.abs(index - progress.value);
    return { opacity: interpolate(abs, [0, 0.35, 0.75], [1, 0.85, 0], 'clamp') };
  });
  // …while the before/after positions show only the TEXT of that night.
  const labelFace = useAnimatedStyle(() => {
    const abs = Math.abs(index - progress.value);
    return { opacity: interpolate(abs, [0.3, 0.75], [0, 1], 'clamp') };
  });

  return (
    <Animated.View
      // z-order and shadow are STATIC per settle (no per-frame layer
      // reshuffling or shadow repaints — they were the deck's jank).
      // The floating shadow belongs to the center card only.
      style={[layerStyle, { zIndex: 100 - Math.abs(depth) * 10 }, animated]}
      pointerEvents={interactive ? 'box-none' : 'none'}
    >
      <View style={interactive ? shadow : undefined}>
        <Animated.View style={cardFace}>{children}</Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' },
            labelFace,
          ]}
        >
          {label}
        </Animated.View>
      </View>
    </Animated.View>
  );
}
