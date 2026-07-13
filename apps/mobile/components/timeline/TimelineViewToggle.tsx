// TimelineViewToggle — "Timeline" / "Grid" segmented chips.
// Same monochrome pattern as FeedScopeToggle: active chip inverts
// (inverseBg / inverseFg), idle chip is a muted label on a card2 track.
// SpringPressable press feedback + light haptic on select.

import { StyleSheet, Text, View } from 'react-native';

import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

export type TimelineViewMode = 'scroll' | 'map';

type TimelineViewToggleProps = {
  mode: TimelineViewMode;
  onChange: (mode: TimelineViewMode) => void;
};

const OPTIONS: { value: TimelineViewMode; label: string; a11y: string }[] = [
  { value: 'scroll', label: 'Timeline', a11y: 'Timeline — the memory wheel' },
  { value: 'map', label: 'Grid', a11y: 'Grid — the whole timeline as a photo grid' },
];

export function TimelineViewToggle({ mode, onChange }: TimelineViewToggleProps) {
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <SpringPressable
            key={opt.value}
            haptic="light"
            onPress={() => {
              if (!active) onChange(opt.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.a11y}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </SpringPressable>
        );
      })}
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      backgroundColor: tokens.colors.card2,
      borderRadius: tokens.radius.full,
      padding: 2,
      gap: 2,
    },
    segment: {
      paddingHorizontal: 11,
      paddingVertical: 4,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: tokens.colors.inverseBg,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.colors.mute,
      letterSpacing: -0.1,
    },
    labelActive: {
      color: tokens.colors.inverseFg,
      fontWeight: '800',
    },
  });
