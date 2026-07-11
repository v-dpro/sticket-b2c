import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';

export function LoadingSpinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  const { tokens } = useTheme();
  return (
    <View style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size={size} color={tokens.colors.brandCyan} />
    </View>
  );
}
