// FeedScopeToggle — the two-chip segmented control in the Feed header.
// "Friends" / "Friends+" drive the audience scope of the feed. Monochrome
// per the design bible: the active chip inverts (inverseBg / inverseFg),
// the idle chip reads as a muted label on a card2 track. Springs + light
// haptic on select.

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
      backgroundColor: tokens.colors.card2,
      borderRadius: tokens.radius.full,
      padding: 2,
      gap: 2,
    },
    segment: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: tokens.colors.inverseBg,
    },
    label: {
      fontSize: 12.5,
      fontWeight: '600',
      color: tokens.colors.mute,
      letterSpacing: -0.1,
    },
    labelActive: {
      color: tokens.colors.inverseFg,
      fontWeight: '800',
    },
  });
