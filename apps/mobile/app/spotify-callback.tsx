import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '../components/ui/Screen';
import { spacing } from '../lib/theme';
import { useTheme } from '../lib/theme-context';

// In most flows we use WebBrowser.openAuthSessionAsync which does not need an in-app route.
// This screen exists mainly for deep-link parity + debugging.
export default function SpotifyCallback() {
  const { tokens } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Spotify' }} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ color: tokens.colors.textHi, fontSize: 18, fontWeight: '800' }}>Spotify callback</Text>
        <Text style={{ color: tokens.colors.textMid, textAlign: 'center' }}>
          You can close this screen and return to the app.
        </Text>
      </View>
    </Screen>
  );
}



