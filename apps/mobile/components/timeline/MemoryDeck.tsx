// MemoryDeck — the timeline as a WHEEL you spin in place.
// The screen never scrolls: one big vertical card owns the stage; the
// nights before and after appear as fixed TEXT SLOTS above and below it
// (the full card only exists at center — it blooms in as it lands). A
// vertical swipe turns the wheel: cards arc on a drum with perspective
// tilt; every card that passes center CLICKS (light haptic, medium on a
// month crossing); a hard flick free-spins through many cards with decay
// — scroll speed IS travel speed — then snaps to the nearest night. The
// month readout above the stage ticks live as the wheel turns.
//
// Contract with you.tsx:
//   items       — chronological deck (future plans first, then past
//                 entries newest→oldest), stable `key` per item.
//   renderCard  — the full card (center only).
//   renderLabel — the text-only face for the before/after slots.
//   accessory   — right side of the readout row (the Scroll ⇄ Map toggle
//                 lives here so the stage gets its height back).
//   snapTo      — imperative jump (map marker fly-to) via ref.

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
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
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
  /** cardMaxH — the stage's height budget for the card (0 until the stage
      has been measured). Cards should SIZE THEMSELVES TO FILL it: slack
      here is dead screen between the card and the label slots. */
  renderCard: (item: DeckItem, isCentered: boolean, cardMaxH: number) => React.ReactNode;
  /** The torn ticket-end face for the fixed before/after slots. `edge` is
      where the slot sits, so the perforation can face the center card. */
  renderLabel: (item: DeckItem, edge: 'top' | 'bottom') => React.ReactNode;
  /** Month readout text per item ("JUL 2026" / "UPCOMING · AUG 2026"). */
  readoutFor: (item: DeckItem) => string;
  /** Rendered at the right of the readout row (Scroll ⇄ Map toggle). */
  accessory?: React.ReactNode;
  /** Hide the internal readout row — the screen renders its own (big-month
      header) driven by onIndexChange. */
  showReadout?: boolean;
  /** The timeline spine: an ink rail down the left edge with a thumb that
      glides as the wheel turns (default on). */
  spine?: boolean;
  onIndexChange?: (index: number) => void;
  onNearEnd?: () => void;
  /** Pull-down past the first card triggers this (deck's pull-to-refresh). */
  onOverscrollRefresh?: () => void;
};

// Horizontal inset of the card layers — wider than screen pad so the big
// vertical card leaves air for the wheel's tilt.
export const CARD_INSET = 28;
// Height of each fixed ticket-end slot (before/after nights).
const LABEL_SLOT = 54;
// The bottom slot floats this far above the stage floor — the nav bar's
// ticket stub pops out of the bar and must never touch the label.
const BOTTOM_LIFT = 12;
// Flicks faster than this (cards/second) free-spin the wheel with decay.
// Low on purpose: a moderate swipe should GLIDE over several cards, not
// notch to the neighbor — only a slow deliberate drag single-steps.
const SPIN_VELOCITY = 0.8;
// Near-tail threshold for pagination.
const NEAR_END = 6;
// Spring for the settle — snappy, no bounce past the neighbor.
const SETTLE_SPRING = { stiffness: 320, damping: 30, mass: 0.8 };

export const MemoryDeck = forwardRef<MemoryDeckHandle, MemoryDeckProps>(function MemoryDeck(
  {
    items,
    initialIndex,
    renderCard,
    renderLabel,
    readoutFor,
    accessory,
    showReadout = true,
    spine = true,
    onIndexChange,
    onNearEnd,
    onOverscrollRefresh,
  },
  ref,
) {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardW = windowWidth - CARD_INSET * 2;
  // The stage self-measures so cards can fill it exactly — no dead bands
  // between the card and the label slots.
  const [stageH, setStageH] = useState(0);
  const cardMaxH = Math.max(0, stageH - LABEL_SLOT * 2 - BOTTOM_LIFT - 12);
  // One card-step of wheel travel — the full card height, so the incoming
  // card sweeps through the stage while the outgoing one exits.
  const stride = Math.round(cardMaxH > 200 ? Math.max(cardW * 1.05, cardMaxH * 0.98) : cardW * 1.05);

  const count = items.length;
  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(Math.max(count - 1, 0), i)),
    [count],
  );

  const progress = useSharedValue(clampIndex(initialIndex));
  const dragStart = useSharedValue(0);
  // Idle bob — only the settled center card breathes (±2.5px, slow).
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

  // THE CLICK. Fires on every card crossing — during the drag, during a
  // free spin, during the settle. Light per card; medium when the wheel
  // crosses into a different month. Also keeps `index` live so the
  // mounted window and the label slots ride along with a long spin.
  const tick = useCallback(
    (curr: number) => {
      const prev = indexRef.current;
      if (curr === prev) return;
      const prevMonth = items[prev]?.monthKey;
      const nextMonth = items[curr]?.monthKey;
      if (prevMonth && nextMonth && prevMonth !== nextMonth) haptics.medium();
      else haptics.light();
      setIndex(curr);
      onIndexChange?.(curr);
      if (count > 0 && curr >= count - NEAR_END) onNearEnd?.();
    },
    [items, count, onIndexChange, onNearEnd],
  );

  useAnimatedReaction(
    () => {
      const max = Math.max(count - 1, 0);
      return Math.round(Math.max(0, Math.min(max, progress.value)));
    },
    (curr, prev) => {
      if (prev !== null && curr !== prev) runOnJS(tick)(curr);
    },
    [count, tick],
  );

  // Settle only reconciles final state — the last crossing already ticked.
  const settle = useCallback(
    (target: number) => {
      if (target !== indexRef.current) {
        setIndex(target);
        onIndexChange?.(target);
      }
      if (count > 0 && target >= count - NEAR_END) onNearEnd?.();
    },
    [count, onIndexChange, onNearEnd],
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
          const velocity = -e.velocityY / stride; // cards/second
          if (Math.abs(velocity) > SPIN_VELOCITY) {
            // WHEEL SPIN: momentum carries through as many cards as the
            // flick deserves — the reaction above clicks each one — then
            // snaps to the nearest night when the spin dies.
            progress.value = withDecay(
              { velocity, deceleration: 0.9975, clamp: [0, max] },
              () => {
                const target = Math.max(0, Math.min(max, Math.round(progress.value)));
                progress.value = withSpring(target, SETTLE_SPRING);
                runOnJS(settle)(target);
              },
            );
          } else {
            // SENSITIVE COMMIT: any deliberate gesture moves at least one
            // card; only a truly tiny nudge snaps back.
            const start = Math.round(dragStart.value);
            const carried = progress.value - dragStart.value + velocity * 0.6;
            let target: number;
            if (Math.abs(carried) < 0.12) {
              target = start;
            } else {
              target = start + Math.sign(carried) * Math.max(1, Math.round(Math.abs(carried)));
            }
            target = Math.max(0, Math.min(max, target));
            progress.value = withSpring(target, SETTLE_SPRING);
            runOnJS(settle)(target);
          }
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: 4,
      paddingBottom: 8,
      gap: 12,
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
    // overflow hidden: transiting cards must never escape the stage and
    // ghost under the fixed chrome above it.
    stage: { flex: 1, overflow: 'hidden' },
    layer: {
      // Every card lives on a full-stage layer that centers it; the wheel
      // transform slides the layer, so mixed card heights all pivot
      // around the same stage center.
      position: 'absolute',
      top: LABEL_SLOT,
      bottom: LABEL_SLOT + BOTTOM_LIFT,
      left: CARD_INSET,
      right: CARD_INSET,
      justifyContent: 'center',
    },
    // Fixed ticket-end slots — the night before (top) and after (bottom),
    // aligned to the card column so the deck reads as one ticket roll.
    slot: {
      position: 'absolute',
      left: CARD_INSET,
      right: CARD_INSET,
      height: LABEL_SLOT,
      justifyContent: 'center',
      zIndex: 300,
    },
  }));

  const item = items[index];
  const readout = item ? readoutFor(item) : '';
  const prevItem = index > 0 ? items[index - 1] : null;
  const nextItem = index < count - 1 ? items[index + 1] : null;

  return (
    <View style={styles.root}>
      {showReadout ? (
        // Fixed readout — the date lives HERE and ticks as the wheel turns.
        <View style={styles.readoutRow}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexShrink: 1 }}>
            {/* Key on the text: month changes re-enter with a small fade. */}
            <Animated.View key={readout} entering={FadeIn.duration(140)}>
              <Text style={styles.readout}>{readout}</Text>
            </Animated.View>
            <Text style={styles.counter}>{count > 0 ? `${index + 1}/${count}` : ''}</Text>
          </View>
          {accessory}
        </View>
      ) : null}

      <GestureDetector gesture={pan}>
        <View
          style={styles.stage}
          collapsable={false}
          onLayout={(e) => setStageH(e.nativeEvent.layout.height)}
        >
          {spine && count > 1 ? <TimelineSpine progress={progress} count={count} /> : null}
          {/* The night BEFORE — text only, pinned above the card. */}
          <View style={[styles.slot, { top: 0 }]} pointerEvents="none">
            {prevItem ? (
              <Animated.View key={prevItem.key} entering={FadeIn.duration(160)} style={{ flex: 1 }}>
                {renderLabel(prevItem, 'top')}
              </Animated.View>
            ) : null}
          </View>

          {items.map((deckItem, i) =>
            Math.abs(i - index) <= 1 ? (
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
              >
                {renderCard(deckItem, i === index, cardMaxH)}
              </DeckLayer>
            ) : null,
          )}

          {/* The night AFTER — text only, pinned below the card. */}
          <View style={[styles.slot, { bottom: BOTTOM_LIFT }]} pointerEvents="none">
            {nextItem ? (
              <Animated.View key={nextItem.key} entering={FadeIn.duration(160)} style={{ flex: 1 }}>
                {renderLabel(nextItem, 'bottom')}
              </Animated.View>
            ) : null}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
});

// ─── TimelineSpine ─────────────────────────────────────────────────
// The line of time. A hairline rail down the left edge of the stage with
// an ink thumb that glides as the wheel turns — up toward the future,
// down into history. It rides `progress` directly, so it moves live
// during drags, momentum spins, and settles.

function TimelineSpine({ progress, count }: { progress: SharedValue<number>; count: number }) {
  const { tokens } = useTheme();
  const [railHeight, setRailHeight] = useState(0);
  const THUMB = 26;

  const thumbStyle = useAnimatedStyle(() => {
    const max = Math.max(count - 1, 1);
    const p = Math.max(0, Math.min(max, progress.value)) / max;
    return {
      transform: [{ translateY: p * Math.max(railHeight - THUMB, 0) }],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 9,
        top: LABEL_SLOT,
        bottom: LABEL_SLOT,
        width: 3,
        zIndex: 250,
      }}
      onLayout={(e) => setRailHeight(e.nativeEvent.layout.height)}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 1,
          width: 1,
          backgroundColor: tokens.colors.line,
        }}
      />
      <Animated.View
        style={[
          {
            width: 3,
            height: THUMB,
            borderRadius: 2,
            backgroundColor: tokens.colors.fg,
          },
          thumbStyle,
        ]}
      />
    </View>
  );
}

type DeckLayerProps = {
  index: number;
  /** index − live center index; static per render, sets the z-order. */
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
  children,
}: DeckLayerProps) {
  // Reduced-motion fallback (handoff §3): the wheel becomes a plain
  // crossfade pager — no drum tilt, no travel, no bob. Haptics stay.
  const reducedMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => {
    const d = index - progress.value;
    const abs = Math.abs(d);
    if (reducedMotion) {
      return {
        transform: [{ translateY: 0 }, { rotateX: '0deg' }, { scale: 1 }],
        opacity: interpolate(abs, [0, 0.5], [1, 0], 'clamp'),
      };
    }
    // THE WHEEL. Cards are mounted on a drum you spin in place: each card
    // sits at angle d·STEP on a circle; translateY follows the arc and
    // rotateX tips the card back with perspective as it leaves center.
    const STEP = 0.55; // radians of drum rotation per card
    const angle = Math.max(-1.3, Math.min(1.3, d * STEP));
    const radius = stride / Math.sin(STEP);
    // The idle bob only breathes when this card owns the center.
    const bobPx =
      interpolate(abs, [0, 0.25], [1, 0], 'clamp') * interpolate(bob.value, [0, 1], [2.5, -2.5]);
    return {
      transform: [
        { perspective: 900 },
        { translateY: radius * Math.sin(angle) + bobPx },
        { rotateX: `${-angle * 57.2958 * 0.52}deg` },
        { scale: interpolate(abs, [0, 1], [1, 0.92], 'clamp') },
      ],
      // Only the centered card is a card — it dissolves to nothing as it
      // leaves (the fixed text slots carry the before/after nights).
      opacity: interpolate(abs, [0, 0.55, 0.9], [1, 0.55, 0], 'clamp'),
    };
  });

  return (
    <Animated.View
      // z-order and shadow are STATIC per tick (no per-frame layer
      // reshuffling or shadow repaints). Shadow rides the center card.
      style={[layerStyle, { zIndex: 100 - Math.abs(depth) * 10 }, animated]}
      pointerEvents={interactive ? 'box-none' : 'none'}
    >
      <View style={interactive ? shadow : undefined}>{children}</View>
    </Animated.View>
  );
}
