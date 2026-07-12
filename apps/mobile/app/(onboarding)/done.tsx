// ONBOARDING · DONE — the success moment. Brand-gradient mark, "You're in",
// and a single Enter Sticket button. completeOnboarding() persists the flag
// the app/index gate reads, then → home.

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandMark } from '../../components/onboarding/BrandMark';
import { PillButton } from '../../components/ui/PillButton';
import { Confetti } from '../../components/ui/Confetti';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function DoneOnboarding() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user, refresh } = useSession();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    haptics.success();
  }, []);

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 18 },
    title: { fontSize: 40, fontWeight: '800', letterSpacing: -1, color: t.colors.fg, textAlign: 'center', marginTop: 6 },
    subtitle: {
      fontSize: 16,
      fontWeight: '400',
      color: t.colors.mute,
      textAlign: 'center',
      lineHeight: 23,
      marginTop: -6,
    },
    footer: { paddingHorizontal: t.density.pad, paddingBottom: 12, gap: 10 },
  }));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Persisted by the onboarding store (AsyncStorage); app/index reads it
      // alongside session state to gate the app.
      await completeOnboarding();
      await refresh();
      haptics.success();
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Confetti active originY={0.32} />

      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <BrandMark size={84} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(80).duration(340)} style={styles.title}>
          You’re in
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(340)} style={styles.subtitle}>
          Your live-events life starts now. Log shows, rank them, and never miss a presale.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(240).duration(340)} style={styles.footer}>
        <PillButton
          title={saving ? 'Finishing…' : 'Enter Sticket'}
          size="lg"
          springFeedback
          haptic="medium"
          disabled={saving}
          icon={saving ? <ActivityIndicator size="small" color={tokens.colors.inverseFg} /> : undefined}
          onPress={() => void finish()}
        />
        {/* Résumé lane (A3) — optional, never a gate. */}
        <PillButton
          title="Add your past shows (2 min)"
          variant="ghost"
          size="lg"
          springFeedback
          disabled={saving}
          onPress={() => router.push('/(onboarding)/backfill')}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
