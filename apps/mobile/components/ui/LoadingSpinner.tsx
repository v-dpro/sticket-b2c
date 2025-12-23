import { ActivityIndicator, View } from 'react-native';

import { colors } from '../../lib/theme';

export function LoadingSpinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  return (
    <View style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size={size} color={colors.brandCyan} />
    </View>
  );
}



