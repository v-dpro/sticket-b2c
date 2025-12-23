import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../lib/theme';

type ScreenProps = PropsWithChildren<{ padded?: boolean }>;

export function Screen({ children, padded = true }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: padded ? 24 : 0 }}>{children}</View>
    </SafeAreaView>
  );
}




