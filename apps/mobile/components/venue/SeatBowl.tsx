// SeatBowl (C24) — a generic venue schematic built from section names
// alone: a STAGE slab at the bottom, sections fanned above it in
// concentric arcs. GA/floor-ish sections sit in the innermost arc
// (closest to the stage); everything else is sorted alphanumerically and
// split into arcs of 4-6 blocks, stacking outward (farther from the
// stage = higher up the schematic). Each block is rotated toward the
// stage and translated to trace the arc's curvature — see
// buildBowlArcs/buildBowlRows below for the exact math.
//
// Sections with photos render as a filled ink block ("NAME · count" in
// inverseFg); sections without render as a hairline-bordered block with a
// muted label. Both are tappable — same handler, same
// SeatSectionSheet — an empty block's tap is the "be the first" path.
//
// Works on any list of section names (event seat-sections or a
// venue-derived grouping); caps at 24 blocks and notes the rest as
// "+N MORE SECTIONS".

import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import type { EventSeatSection } from '../../lib/api/events';
import { durations, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type SeatBowlProps = {
  sections: EventSeatSection[];
  onPressSection: (section: EventSeatSection) => void;
};

// ── Layout constants ───────────────────────────────────────────────
const MAX_BLOCKS = 24;
const MAX_PER_ARC = 6;
const BLOCK_GAP = 8;
const BLOCK_HEIGHT = 38;
const BLOCK_MIN_WIDTH = 44;
const BLOCK_MAX_WIDTH = 108;
const ARC_GAP = 22; // vertical gap between arcs — generous enough to clear the curve's translateY

// GA/floor/pit-style sections read as "on the ground, right up front" —
// cheap heuristic on the name, not a fixed section-name whitelist.
const FLOOR_PATTERN = /^(GA|FLOOR|PIT|STANDING|GENERAL ADMISSION)\b|^GA[\s-]?\d/;

function isFloorLike(name: string): boolean {
  return FLOOR_PATTERN.test(name.trim().toUpperCase());
}

function alphaNumCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Split `items` into arcs of MAX_PER_ARC or fewer, sized as evenly as
// possible (arc count = ceil(n / MAX_PER_ARC), each arc floor(n/count) or
// +1) so a run of e.g. 10 sections becomes [6, 4] rather than [6, 4] vs a
// lonely [6,1] tail.
function chunkArcs<T>(items: T[]): T[][] {
  const n = items.length;
  if (n === 0) return [];
  if (n <= MAX_PER_ARC) return [items];
  const count = Math.ceil(n / MAX_PER_ARC);
  const base = Math.floor(n / count);
  const extra = n % count;
  const out: T[][] = [];
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    out.push(items.slice(idx, idx + size));
    idx += size;
  }
  return out;
}

// arcs[0] = the tier nearest the stage (floor/GA, if any), arcs[last] =
// farthest out. Caps the total at MAX_BLOCKS, floor tier taking priority.
function buildBowlArcs(sections: EventSeatSection[]): { arcs: EventSeatSection[][]; overflow: number } {
  const floor = sections
    .filter((s) => isFloorLike(s.section))
    .sort((a, b) => alphaNumCompare(a.section, b.section));
  const rest = sections
    .filter((s) => !isFloorLike(s.section))
    .sort((a, b) => alphaNumCompare(a.section, b.section));

  const cappedFloor = floor.slice(0, MAX_BLOCKS);
  const restBudget = Math.max(0, MAX_BLOCKS - cappedFloor.length);
  const cappedRest = rest.slice(0, restBudget);
  const overflow = sections.length - cappedFloor.length - cappedRest.length;

  const arcs: EventSeatSection[][] = [];
  if (cappedFloor.length > 0) arcs.push(cappedFloor);
  arcs.push(...chunkArcs(cappedRest));

  return { arcs, overflow };
}

type BowlBlock = {
  section: EventSeatSection;
  rotateDeg: number;
  translateY: number;
  delay: number;
};

type BowlRow = { key: string; blocks: BowlBlock[] };

// Precomputes each block's tilt/curve/stagger — independent of measured
// width, so this only needs to re-run when `sections` changes.
//
// Per arc (arcIndex 0 = nearest the stage): rotation edges out to
// min(9 + arcIndex*3, 18)° (±9-18° per spec, growing arc-by-arc) and each
// block's translateY bows up to min(8 + arcIndex*2, 14)px at the arc's
// edges — both zero at the arc's center block, so a row reads as a fan
// that curves up and away from the stage at its ends. Rows render
// outermost-first (top of the schematic) down to the floor tier, which
// sits directly above the STAGE slab.
function buildBowlRows(sections: EventSeatSection[]): { rows: BowlRow[]; overflow: number } {
  const { arcs, overflow } = buildBowlArcs(sections);
  let cursor = 0;

  const rows: BowlRow[] = [...arcs]
    .map((blocks, arcIndex) => ({ arcIndex, blocks }))
    .reverse()
    .map(({ arcIndex, blocks }) => {
      const n = blocks.length;
      const center = (n - 1) / 2;
      const rotMax = Math.min(9 + arcIndex * 3, 18);
      const curveDepth = Math.min(8 + arcIndex * 2, 14);
      return {
        key: `arc-${arcIndex}`,
        blocks: blocks.map((section, j) => {
          const p = center === 0 ? 0 : (j - center) / center; // -1 (left edge) .. 1 (right edge)
          return {
            section,
            rotateDeg: -p * rotMax, // fans inward: left tilts clockwise, right tilts counter-clockwise
            translateY: -Math.abs(p) * curveDepth, // edges bow up, away from the stage
            delay: Math.min(cursor++, 16) * durations.stagger,
          };
        }),
      };
    });

  return { rows, overflow };
}

function blockWidthFor(n: number, containerWidth: number): number {
  if (containerWidth <= 0 || n <= 0) return BLOCK_MIN_WIDTH;
  const raw = (containerWidth - BLOCK_GAP * (n - 1)) / n;
  return Math.max(BLOCK_MIN_WIDTH, Math.min(BLOCK_MAX_WIDTH, raw));
}

// Memoized: `sections` is replaced by identity on refetch and callers pass
// a stable state setter as `onPressSection`, so shallow compare holds.
export const SeatBowl = memo(function SeatBowl({ sections, onPressSection }: SeatBowlProps) {
  const [width, setWidth] = useState(0);
  const styles = useThemedStyles(buildStyles);

  const { rows, overflow } = useMemo(() => buildBowlRows(sections), [sections]);

  if (sections.length === 0) return null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout}>
      {overflow > 0 ? <Text style={styles.overflow}>+{overflow} MORE SECTIONS</Text> : null}

      {rows.map((row, i) => {
        const bw = blockWidthFor(row.blocks.length, width);
        return (
          <View key={row.key} style={[styles.arcRow, i > 0 && styles.arcRowSpaced]}>
            {row.blocks.map(({ section, rotateDeg, translateY, delay }) => {
              const filled = section.photoCount > 0;
              const label = filled
                ? `Section ${section.section}, ${section.photoCount} photo${section.photoCount === 1 ? '' : 's'}`
                : `Section ${section.section}, no photos yet — be the first`;
              return (
                <Animated.View
                  key={section.section}
                  entering={tearIn(delay)}
                  style={{ width: bw, transform: [{ translateY }, { rotate: `${rotateDeg}deg` }] }}
                >
                  <SpringPressable
                    haptic="light"
                    onPress={() => onPressSection(section)}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={[styles.block, filled ? styles.blockFilled : styles.blockEmpty]}
                  >
                    <Text style={filled ? styles.blockLabel : styles.blockLabelMuted} numberOfLines={1}>
                      {section.section.toUpperCase()}
                    </Text>
                    {filled ? (
                      <Text style={styles.blockCount} numberOfLines={1}>
                        · {section.photoCount}
                      </Text>
                    ) : null}
                  </SpringPressable>
                </Animated.View>
              );
            })}
          </View>
        );
      })}

      <View style={styles.stage}>
        <Text style={styles.stageLabel}>Stage</Text>
      </View>
    </View>
  );
});

const buildStyles = (t: ThemeTokens) =>
  StyleSheet.create({
    overflow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      textAlign: 'center',
      marginBottom: 12,
    },
    arcRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: BLOCK_GAP,
    },
    arcRowSpaced: { marginTop: ARC_GAP },
    block: {
      height: BLOCK_HEIGHT,
      borderRadius: t.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    blockFilled: { backgroundColor: t.colors.inverseBg },
    blockEmpty: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
    },
    blockLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: t.colors.inverseFg,
    },
    blockLabelMuted: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    blockCount: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 9,
      color: t.colors.inverseFg,
      opacity: 0.7,
      marginTop: 1,
    },
    stage: {
      marginTop: ARC_GAP,
      height: 42,
      borderRadius: t.radius.sm,
      borderWidth: 1.5,
      borderColor: t.colors.line,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  });
