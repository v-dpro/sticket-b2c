// SeatMapPicker — an interactive venue seat map rendered from REAL
// Ticketmaster geometry (one SVG <Path> per section). Unlike SeatBowl,
// which fabricates a schematic from section names alone, this draws the
// venue's actual bowl and lets you tap the section you sat in.
//
// Contract (from the API): a SeatMap of { width, height, sections[] } in
// the map's own coordinate space; each section carries an SVG path plus a
// label anchor. We fit that space to the container width, preserving the
// map's aspect ratio (height = width * H/W), and never overflow.
//
// Colour follows the theme, not hardcoded hues: floor/orchestra tiers take
// the violet accent (accentSets.purple), everything else grades through the
// neutral card surfaces the way SeatBowl's blocks do. Selection is a solid
// violet fill with an ink outline; a press gives a soft-violet active state.
//
// Zoom: pinch + two-finger pan (single-finger taps stay free to select a
// section). GestureHandlerRootView is mounted at the app root, so the
// GestureDetector here is live.

import React, { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export type SeatMapSection = {
  id: string;
  name: string;
  level: string;
  /** SVG path data in the map's own coordinate space (viewBox units). */
  path: string;
  labelX: number;
  labelY: number;
};

export type SeatMap = {
  width: number;
  height: number;
  sections: SeatMapSection[];
};

type SeatMapPickerProps = {
  seatMap: SeatMap;
  /** Currently-picked section NAME (matched case-insensitively). */
  selectedSection?: string | null;
  /** Fires with the tapped section's `name` — the shape memory.tsx stores. */
  onSelect: (sectionName: string) => void;
};

const MAX_SCALE = 3.5;

/** Case/space-insensitive section match — mirrors SeatBowl.sameSection. */
function sameSection(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

// Group a Ticketmaster level string into a paint tier. Keyword-matched on
// the name (not a fixed whitelist) so unfamiliar level strings still land
// on a sensible neutral rather than vanishing.
type Tier = 'floor' | 'lower' | 'upper' | 'general' | 'default';

function classifyLevel(level: string): Tier {
  const l = (level || '').toLowerCase();
  if (/floor|orchestra|pit|parterre|stalls/.test(l)) return 'floor';
  if (/lower|club|loge/.test(l)) return 'lower';
  if (/upper|balcony|terrace|gallery|mezzanine|grand/.test(l)) return 'upper';
  if (/general|\bga\b|standing|lawn|admission|bleacher/.test(l)) return 'general';
  return 'default';
}

type Paint = { fill: string; stroke: string; strokeWidth: number };

// Idle fills per tier: floor/orchestra tint violet (soft), the rest grade
// through the same neutral surfaces SeatBowl uses (card2 → card → hairline).
function buildPaints(t: ThemeTokens): {
  idle: Record<Tier, Paint>;
  pressed: Paint;
  selected: Paint;
  labelIdle: string;
  labelSelected: string;
} {
  const c = t.colors;
  const violet = t.accentSets.purple;
  return {
    idle: {
      floor: { fill: violet.soft, stroke: violet.line, strokeWidth: 1 },
      lower: { fill: c.card2, stroke: c.line, strokeWidth: 1 },
      upper: { fill: c.card, stroke: c.line, strokeWidth: 1 },
      general: { fill: c.hairline, stroke: c.lineSoft, strokeWidth: 1 },
      default: { fill: c.card, stroke: c.line, strokeWidth: 1 },
    },
    // Active (finger down, not yet selected): soft violet wash + violet edge.
    pressed: { fill: violet.soft, stroke: violet.line, strokeWidth: 1.5 },
    // Selected: solid violet fill + light ink outline.
    selected: { fill: violet.hex, stroke: c.fg, strokeWidth: 1.75 },
    labelIdle: c.mute,
    labelSelected: c.fg,
  };
}

export function SeatMapPicker({ seatMap, selectedSection, onSelect }: SeatMapPickerProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const paints = useMemo(() => buildPaints(tokens), [tokens]);

  // Which section the finger is currently pressing (soft-violet feedback).
  const [pressedId, setPressedId] = useState<string | null>(null);

  // ── Zoom / pan (shared values live on the UI thread) ──
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  // Rendered container size — needed to clamp the pan so the map can't be
  // dragged fully out of frame.
  const frameW = useSharedValue(0);
  const frameH = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    frameW.value = e.nativeEvent.layout.width;
    frameH.value = e.nativeEvent.layout.height;
  };

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((e) => {
          const next = savedScale.value * e.scale;
          scale.value = Math.min(Math.max(next, 1), MAX_SCALE);
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          // Fully zoomed out → recentre so we never rest off-frame.
          if (scale.value <= 1.001) {
            translateX.value = 0;
            translateY.value = 0;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
          }
        }),
    [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY],
  );

  // Two-finger pan only — a single finger stays free to tap a section.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .onUpdate((e) => {
          const maxX = (frameW.value * (scale.value - 1)) / 2;
          const maxY = (frameH.value * (scale.value - 1)) / 2;
          const nx = savedTranslateX.value + e.translationX;
          const ny = savedTranslateY.value + e.translationY;
          translateX.value = Math.min(Math.max(nx, -maxX), maxX);
          translateY.value = Math.min(Math.max(ny, -maxY), maxY);
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [frameW, frameH, scale, translateX, translateY, savedTranslateX, savedTranslateY],
  );

  const gesture = useMemo(() => Gesture.Simultaneous(pinch, pan), [pinch, pan]);

  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Fit responsively: container reserves the map's aspect ratio, and the Svg
  // fills it at 100% — height follows width * (H/W) with no manual math and
  // no horizontal overflow (the frame clips).
  const ratio = seatMap.width > 0 ? seatMap.width / seatMap.height : 1;

  if (!seatMap || seatMap.sections.length === 0) return null;

  const select = (name: string) => {
    haptics.light();
    onSelect(name);
  };

  return (
    <View style={[styles.frame, { aspectRatio: ratio }]} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.fill, mapStyle]}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${seatMap.width} ${seatMap.height}`}>
            {seatMap.sections.map((s) => {
              const selected = !!selectedSection && sameSection(s.name, selectedSection);
              const pressed = pressedId === s.id;
              const paint = selected
                ? paints.selected
                : pressed
                  ? paints.pressed
                  : paints.idle[classifyLevel(s.level)];
              return (
                <Path
                  key={s.id}
                  d={s.path}
                  fill={paint.fill}
                  stroke={paint.stroke}
                  strokeWidth={paint.strokeWidth}
                  strokeLinejoin="round"
                  onPress={() => select(s.name)}
                  onPressIn={() => setPressedId(s.id)}
                  onPressOut={() => setPressedId(null)}
                  accessible
                  accessibilityLabel={`Section ${s.name}${selected ? ', selected' : ''}`}
                />
              );
            })}

            {/* Labels sit on top; they carry the same tap so a hit on the
                name selects the section just like a hit on the shape. */}
            {seatMap.sections.map((s) => {
              const selected = !!selectedSection && sameSection(s.name, selectedSection);
              return (
                <SvgText
                  key={`${s.id}-label`}
                  x={s.labelX}
                  y={s.labelY}
                  fill={selected ? paints.labelSelected : paints.labelIdle}
                  fontSize={11}
                  fontWeight={selected ? '700' : '600'}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  onPress={() => select(s.name)}
                >
                  {s.name}
                </SvgText>
              );
            })}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const buildStyles = (t: ThemeTokens) => ({
  frame: {
    width: '100%' as const,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.hairline,
    backgroundColor: t.colors.card2,
    overflow: 'hidden' as const, // clips zoom/pan — no horizontal overflow
  },
  fill: {
    width: '100%' as const,
    height: '100%' as const,
  },
});
