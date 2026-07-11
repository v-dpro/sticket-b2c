// StarRow — an interactive 1–5 star tap row, monochrome per the design bible
// (filled = ink, empty = muteSoft; no gold, no gradient). Tapping the current
// value clears it back to 0. `disabled` renders a dimmed, non-interactive row
// (used for the seat rating "coming soon" state — no server route yet).

import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { haptics } from '../../../lib/motion';
import { useTheme } from '../../../lib/theme-context';
import { SpringPressable } from '../../ui/SpringPressable';

type StarRowProps = {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: number;
};

export function StarRow({ value, onChange, disabled = false, size = 30 }: StarRowProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View
      style={{ flexDirection: 'row', gap: 8, opacity: disabled ? 0.4 : 1 }}
      accessibilityRole="adjustable"
      accessibilityLabel={`Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = value >= star;
        return (
          <SpringPressable
            key={star}
            disabled={disabled}
            shakeWhenDisabled={false}
            haptic="none"
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            onPress={() => {
              haptics.light();
              onChange?.(value === star ? 0 : star);
            }}
          >
            <Ionicons name={active ? 'star' : 'star-outline'} size={size} color={active ? c.fg : c.muteSoft} />
          </SpringPressable>
        );
      })}
    </View>
  );
}
