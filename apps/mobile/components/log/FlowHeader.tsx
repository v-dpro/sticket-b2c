// FlowHeader — the log-flow modal header: leading icon button (close or
// back), a centered mono step label, and a balancing spacer. Every log-flow
// screen hides the native stack header and renders this instead.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type FlowHeaderProps = {
  /** Leading button glyph. 'close' for flow entry, 'back' mid-flow. */
  icon: 'close' | 'back';
  /** Mono eyebrow label, rendered uppercase (e.g. "LOG A SHOW"). */
  label: string;
  onPress: () => void;
};

export function FlowHeader({ icon, label, onPress }: FlowHeaderProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View
      style={{
        height: 52,
        paddingHorizontal: tokens.density.pad,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <SpringPressable
        onPress={onPress}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={icon === 'close' ? 'Close' : 'Back'}
        style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}
      >
        <Ionicons name={icon === 'close' ? 'close' : 'arrow-back'} size={22} color={c.fg} />
      </SpringPressable>

      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: c.muteSoft,
        }}
      >
        {label}
      </Text>

      <View style={{ width: 36, height: 36 }} />
    </View>
  );
}
