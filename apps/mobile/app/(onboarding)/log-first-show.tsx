import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function LogFirstShowOnboarding() {
  const router = useRouter();
  const { hasLoggedFirstShow } = useSession();
  const setFirstShowLogged = useOnboardingStore((s) => s.setFirstShowLogged);

  // If they already logged, continue.
  useEffect(() => {
    if (hasLoggedFirstShow) {
      setFirstShowLogged(true);
      router.replace('/(onboarding)/find-friends');
    }
  }, [hasLoggedFirstShow, router, setFirstShowLogged]);

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.lg, gap: spacing.lg, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center' }}>
          <ProgressDots total={4} current={2} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '800' }}>Log your first show</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
            What’s a show you’ve been to? This unlocks the app.
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Button label="Search a show" onPress={() => router.push('/log/search')} />
          <Button label="Create show" variant="secondary" onPress={() => router.push('/log/create-show')} />
        </View>
      </View>
    </Screen>
  );
}



