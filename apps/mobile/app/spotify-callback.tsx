import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '../components/ui/Screen';
import { colors, spacing } from '../lib/theme';

// In most flows we use WebBrowser.openAuthSessionAsync which does not need an in-app route.
// This screen exists mainly for deep-link parity + debugging.
export default function SpotifyCallback() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Spotify' }} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800' }}>Spotify callback</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          You can close this screen and return to the app.
        </Text>
      </View>
    </Screen>
  );
}



