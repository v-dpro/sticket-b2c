// MemoryChip — a selectable pill chip. Base is card2 / mute / 600 per the
// design bible; the selected state inverts to the monochrome ink fill
// (inverseBg / inverseFg) so it reads like the primary PillButton. Works for
// both single-select (visibility) and multi-select (venue tags) rows.

import { Text } from 'react-native';

import { useTheme } from '../../../lib/theme-context';
import { SpringPressable } from '../../ui/SpringPressable';

type MemoryChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function MemoryChip({ label, selected, onPress }: MemoryChipProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? c.inverseBg : c.card2,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? c.inverseFg : c.mute }}>{label}</Text>
    </SpringPressable>
  );
}
