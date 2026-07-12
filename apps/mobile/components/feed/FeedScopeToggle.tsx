// FeedScopeToggle — the two mono pills in the Feed header.
// "FRIENDS" / "FRIENDS+" drive the audience scope of the feed. Monochrome
// per the design bible (C1): the active pill is the ink inversion
// (inverseBg / inverseFg), the idle pill is a muted mono label on a
// hairline-bordered card. Springs + light haptic on select.

import { StyleSheet, Text, View } from 'react-native';

import type { FeedScope } from '../../lib/api/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

interface FeedScopeToggleProps {
  scope: FeedScope;
  onChange: (scope: FeedScope) => void;
}

const OPTIONS: { value: FeedScope; label: string }[] = [
  { value: 'friends', label: 'Friends' },
  { value: 'fof', label: 'Friends+' },
];

export function FeedScopeToggle({ scope, onChange }: FeedScopeToggleProps) {
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map((opt) => {
        const active = scope === opt.value;
        return (
          <SpringPressable
            key={opt.value}
            haptic="light"
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              opt.value === 'fof'
                ? 'Friends plus friends of friends'
                : 'Friends only'
            }
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
      gap: 6,
    },
    segment: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: tokens.colors.line,
      backgroundColor: tokens.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: tokens.colors.inverseBg,
      borderColor: tokens.colors.inverseBg,
    },
    label: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    labelActive: {
      color: tokens.colors.inverseFg,
    },
  });
