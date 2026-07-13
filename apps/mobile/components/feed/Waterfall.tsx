// Waterfall — the RedNote-style 2-column masonry for the home feed (C22).
//
// Not a FlatList: masonry needs per-column stacking, so this renders one
// ScrollView with a row of two flex columns and runs its own column-height
// accounting — each slot's estimated height (photo pseudo-aspect + fixed
// chrome, supplied by the tile modules) decides which column it lands in,
// keeping the columns balanced. Entity slots follow the weave rule: they
// alternate columns entity-to-entity and are never adjacent to another
// entity on either axis (vertical: never stacked in a column; horizontal:
// never starting inside the previous entity's row across the gutter).
//
// Virtualization: removeClippedSubviews isn't available on plain Views, so
// mounting is capped instead — the first chunk renders up front and more
// append as the scroll nears the end, which also drives pagination via
// onEndReached (the caller guards hasMore/loadingMore).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { durations, tearIn } from '../../lib/motion';

export type WaterfallSlot = {
  key: string;
  /** 'entity' slots obey the no-adjacent-entities rule; posts pack greedily. */
  kind: 'post' | 'entity';
  /** Estimated rendered height at the given column width. */
  estimateHeight: (columnWidth: number) => number;
  render: () => ReactNode;
};

const GUTTER = 8;
const EDGE = 8;
const INITIAL_RENDER = 14;
const RENDER_CHUNK = 12;
// Entrance stagger caps after ~10 tiles — later mounts tear in with no delay.
const STAGGER_CUTOFF = 10;

type Placed = { slot: WaterfallSlot; order: number };

type WaterfallProps = {
  slots: WaterfallSlot[];
  header?: ReactNode;
  footer?: ReactNode;
  refreshControl?: React.ReactElement;
  /** Fired when the scroll nears the end (once per content-height growth). */
  onEndReached?: () => void;
  /** Imperative scroll access (tab re-tap → scroll to top). */
  scrollRef?: React.ComponentProps<typeof ScrollView>['ref'];
};

export function Waterfall({ slots, header, footer, refreshControl, onEndReached, scrollRef }: WaterfallProps) {
  const { width: windowWidth } = useWindowDimensions();
  const styles = useThemedStyles(buildStyles);
  const columnWidth = (windowWidth - EDGE * 2 - GUTTER) / 2;

  const [renderCount, setRenderCount] = useState(INITIAL_RENDER);
  const lastTriggerHeight = useRef(0);

  // ── Column accounting ──
  // Greedy shortest-column for posts; entities alternate columns with the
  // adjacency guards. Assignment is order-stable and append-only, so slicing
  // by `order` (the render cap) never reflows already-visible tiles.
  const columns = useMemo(() => {
    const cols: [Placed[], Placed[]] = [[], []];
    const heights: [number, number] = [0, 0];
    const lastKind: [WaterfallSlot['kind'] | null, WaterfallSlot['kind'] | null] = [null, null];
    let lastEntity: { col: 0 | 1; bottom: number } | null = null;

    slots.forEach((slot, order) => {
      const h = slot.estimateHeight(columnWidth);
      let col: 0 | 1;
      if (slot.kind === 'entity') {
        // Alternate columns entity-to-entity.
        col = lastEntity ? ((1 - lastEntity.col) as 0 | 1) : heights[0] <= heights[1] ? 0 : 1;
        // Horizontal guard: never start inside the previous entity's row
        // across the gutter — drop into its column instead (5-6 posts of
        // spacing means that column can't have it as its bottom tile).
        if (lastEntity && lastEntity.col !== col && heights[col] < lastEntity.bottom) {
          col = lastEntity.col;
        }
        // Vertical guard (trumps): never stack two entities in a column.
        if (lastKind[col] === 'entity') col = (1 - col) as 0 | 1;
        lastEntity = { col, bottom: heights[col] + h };
      } else {
        col = heights[0] <= heights[1] ? 0 : 1;
      }
      cols[col].push({ slot, order });
      heights[col] += h + GUTTER;
      lastKind[col] = slot.kind;
    });

    return cols;
  }, [columnWidth, slots]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const remaining = contentSize.height - contentOffset.y - layoutMeasurement.height;
      if (remaining > layoutMeasurement.height * 1.5) return;
      // Once per content-height growth — the appended chunk / next page
      // grows the content, re-arming the trigger.
      if (contentSize.height === lastTriggerHeight.current) return;
      lastTriggerHeight.current = contentSize.height;
      setRenderCount((c) => (c < slots.length ? c + RENDER_CHUNK : c));
      onEndReached?.();
    },
    [onEndReached, slots.length],
  );

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      refreshControl={refreshControl}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <View style={styles.row}>
        {columns.map((col, i) => (
          <View key={i} style={styles.column}>
            {col
              .filter((p) => p.order < renderCount)
              .map((p) => (
                <Animated.View
                  key={p.slot.key}
                  entering={tearIn(p.order < STAGGER_CUTOFF ? p.order * durations.stagger : 0)}
                  style={styles.cell}
                >
                  {p.slot.render()}
                </Animated.View>
              ))}
          </View>
        ))}
      </View>
      {footer}
    </ScrollView>
  );
}

// ── WaterfallSkeleton — two shimmer columns while the feed loads ────
const SKELETON_HEIGHTS: [number[], number[]] = [
  [190, 148, 232, 168],
  [140, 224, 158, 204],
];

export function WaterfallSkeleton() {
  const styles = useThemedStyles(buildStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [progress]);

  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <View style={styles.content} accessibilityLabel="Loading feed">
      <View style={styles.row}>
        {SKELETON_HEIGHTS.map((colHeights, i) => (
          <View key={i} style={styles.column}>
            {colHeights.map((h, j) => (
              <Animated.View key={j} style={[styles.cell, styles.skeletonBlock, { height: h }, pulse]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    content: {
      paddingTop: 8,
      paddingBottom: 110,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: EDGE,
      gap: GUTTER,
    },
    column: {
      flex: 1,
    },
    cell: {
      marginBottom: GUTTER,
    },
    skeletonBlock: {
      borderRadius: tokens.radius.card,
      backgroundColor: tokens.colors.card2,
    },
  });
