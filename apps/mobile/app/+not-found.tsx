import { usePathname, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { colors } from '../lib/theme';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { Screen } from '../components/ui/Screen';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>Route not found</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
          Sticket opened at: {pathname}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
          Tap a button below to continue.
        </Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          <Button label="Go home" onPress={() => router.replace('/')} />
          {user ? (
            <Button label="Go to Discover" variant="secondary" onPress={() => router.replace('/(tabs)/discover')} />
          ) : (
            <Button label="Go to Sign in" variant="secondary" onPress={() => router.replace('/(auth)/sign-in')} />
          )}
        </View>
      </View>
    </Screen>
  );
}



