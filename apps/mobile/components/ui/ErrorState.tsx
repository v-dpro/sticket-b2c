import { Text, View } from 'react-native';

import { Button } from './Button';
import { useTheme } from '../../lib/theme-context';

export function ErrorState({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={{ padding: 16, gap: 10, alignItems: 'center' }}>
      <Text style={{ color: tokens.colors.error, fontSize: 16, fontWeight: '800' }}>{title}</Text>
      {message ? <Text style={{ color: tokens.colors.textMid, textAlign: 'center' }}>{message}</Text> : null}
      {onRetry ? <Button label="Retry" onPress={onRetry} /> : null}
    </View>
  );
}
