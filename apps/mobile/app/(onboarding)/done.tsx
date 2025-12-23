import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { updateProfile } from '../../lib/local/repo/profileRepo';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function DoneOnboarding() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [isSaving, setIsSaving] = useState(false);

  const finish = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile(user.id, { onboardingCompleted: true });
      await completeOnboarding();
      await refresh();
      router.replace('/(tabs)/feed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.xl, gap: spacing.lg, justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '800' }}>You’re all set</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
            Let’s discover your next show.
          </Text>
        </View>

        <Button label={isSaving ? 'Finishing…' : 'Go to Discover'} disabled={isSaving} onPress={finish} />
      </View>
    </Screen>
  );
}




