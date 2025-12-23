import { Text, View } from 'react-native';

import { Button } from './Button';
import { colors } from '../../lib/theme';

export function ErrorState({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <View style={{ padding: 16, gap: 10, alignItems: 'center' }}>
      <Text style={{ color: colors.error, fontSize: 16, fontWeight: '800' }}>{title}</Text>
      {message ? <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{message}</Text> : null}
      {onRetry ? <Button label="Retry" onPress={onRetry} /> : null}
    </View>
  );
}



