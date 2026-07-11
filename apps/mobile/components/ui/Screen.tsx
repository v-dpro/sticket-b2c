import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../lib/theme-context';

type ScreenProps = PropsWithChildren<{ padded?: boolean }>;

export function Screen({ children, padded = true }: ScreenProps) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: padded ? 24 : 0 }}>{children}</View>
    </SafeAreaView>
  );
}
