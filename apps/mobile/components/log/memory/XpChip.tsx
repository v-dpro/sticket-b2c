// XpChip — the tiny "+N XP" pop shown when a log's first photo earns its
// one-time bonus. Ink fill, mono numerals, springs in with ZoomIn.

import { Text } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useTheme } from '../../../lib/theme-context';

export function XpChip({ amount }: { amount: number }) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <Animated.View
      entering={ZoomIn.springify().stiffness(260).damping(18)}
      style={{
        backgroundColor: c.inverseBg,
        borderRadius: 999,
        paddingHorizontal: 12,
        height: 26,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamilies.monoSemi,
          fontVariant: ['tabular-nums'],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          color: c.inverseFg,
        }}
      >
        +{amount} XP
      </Text>
    </Animated.View>
  );
}
