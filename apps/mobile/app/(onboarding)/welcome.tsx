// ONBOARDING · WELCOME — the front door of the flow. Brand-gradient mark
// (the one sanctioned gradient moment), one-line promise, and a three-line
// "what you get" that staggers in. Primary Continue → set-city.

import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandMark } from '../../components/onboarding/BrandMark';
import { PillButton } from '../../components/ui/PillButton';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useOnboardingStore } from '../../stores/onboardingStore';

const PERKS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'musical-notes', label: 'Log every show you go to' },
  { icon: 'stats-chart', label: 'Rank them, build your canon' },
  { icon: 'notifications', label: 'Never miss a presale' },
];

export default function WelcomeOnboarding() {
  const router = useRouter();
  const { tokens } = useTheme();
  const markWelcomeSeen = useOnboardingStore((s) => s.markWelcomeSeen);

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    hero: {
      flex: 1,
      paddingHorizontal: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    title: {
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: t.colors.fg,
      textAlign: 'center',
      marginTop: 6,
    },
    perks: { alignSelf: 'stretch', gap: 14, marginTop: 24 },
    perkRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    perkIcon: {
      width: 42,
      height: 42,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
    },
    perkLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: t.colors.text },
    footer: { paddingHorizontal: t.density.pad, paddingBottom: 12, gap: 10 },
  }));

  const onContinue = () => {
    markWelcomeSeen();
    router.push('/(onboarding)/set-city');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(320)}>
          <BrandMark />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(60).duration(320)} style={styles.title}>
          Your live-events life
        </Animated.Text>

        <View style={styles.perks}>
          {PERKS.map((perk, i) => (
            <Animated.View
              key={perk.label}
              entering={FadeInDown.delay(160 + i * durations.stagger).duration(300)}
              style={styles.perkRow}
            >
              <View style={styles.perkIcon}>
                <Ionicons name={perk.icon} size={20} color={tokens.colors.fg} />
              </View>
              <Text style={styles.perkLabel}>{perk.label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(320).duration(320)} style={styles.footer}>
        <PillButton title="Continue" size="lg" springFeedback haptic="light" onPress={onContinue} />
      </Animated.View>
    </SafeAreaView>
  );
}
