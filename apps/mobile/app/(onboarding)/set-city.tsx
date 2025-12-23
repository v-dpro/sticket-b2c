import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { updateProfile } from '../../lib/local/repo/profileRepo';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function SetCityOnboarding() {
  const router = useRouter();
  const { user, profile, refresh } = useSession();
  const setCityInStore = useOnboardingStore((s) => s.setCity);

  const [city, setCity] = useState(profile?.city ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const canContinue = useMemo(() => city.trim().length >= 2, [city]);

  const onContinue = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const nextCity = city.trim();
      await updateProfile(user.id, { city: nextCity });
      setCityInStore(nextCity);
      await refresh();
      router.push('/(onboarding)/connect-spotify');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          <ProgressDots total={4} current={0} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '800' }}>Set your city</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
            We’ll show you shows nearby.
          </Text>
        </View>

        <TextField label="City" placeholder="Los Angeles" value={city} onChangeText={setCity} />

        <View style={{ marginTop: 'auto' }}>
          <Button label={isSaving ? 'Saving…' : 'Continue'} disabled={!canContinue || isSaving} onPress={onContinue} />
        </View>
      </View>
    </Screen>
  );
}



