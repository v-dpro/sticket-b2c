import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { useTheme } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { Screen } from '../../components/ui/Screen';

export default function ExpoGoPrefixRedirect() {
  const router = useRouter();
  const { user } = useSession();
  const { tokens } = useTheme();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: tokens.colors.textHi, fontSize: 20, fontWeight: '700' }}>Launching…</Text>
        <Text style={{ color: tokens.colors.textMid, fontSize: 16 }}>
          Expo Go opened a prefixed route. Tap to continue.
        </Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          <Button label="Continue" onPress={() => router.replace('/')} />
          {user ? (
            <Button label="Discover" variant="secondary" onPress={() => router.replace('/(tabs)/explore')} />
          ) : (
            <Button label="Sign in" variant="secondary" onPress={() => router.replace('/(auth)/sign-in')} />
          )}
        </View>
      </View>
    </Screen>
  );
}



