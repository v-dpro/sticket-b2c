import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '../lib/theme';
import { useSession } from '../hooks/useSession';
import { useOnboardingStore } from '../stores/onboardingStore';

export default function Index() {
  const { user, profile, hasLoggedFirstShow, isLoading, error } = useSession();
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);
  const onboardingCity = useOnboardingStore((s) => s.city);
  const spotifyStepCompleted = useOnboardingStore((s) => s.spotifyStepCompleted);
  const artistsStepCompleted = useOnboardingStore((s) => s.artistsStepCompleted);
  const presalePreviewShown = useOnboardingStore((s) => s.presalePreviewShown);
  const checkOnboardingStatus = useOnboardingStore((s) => s.checkOnboardingStatus);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    let mounted = true;
    checkOnboardingStatus()
      .catch(() => {})
      .finally(() => {
        if (mounted) setCheckingOnboarding(false);
      });
    return () => {
      mounted = false;
    };
  }, [checkOnboardingStatus]);

  if (isLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', backgroundColor: colors.background, gap: 12 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700' }}>Setup required</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{error}</Text>
        <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
          If this persists, restart Metro with --clear.
        </Text>
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;

  // If user has already logged their first show, they've completed onboarding
  // Skip all onboarding checks and go straight to the app
  if (hasLoggedFirstShow) {
    return <Redirect href="/(tabs)/feed" />;
  }

  const onboardingComplete = Boolean(profile?.onboardingCompleted) || hasCompletedOnboarding;

  // Gate: onboarding (welcome -> city -> spotify -> artists -> presale preview -> first log -> friends -> done)
  if (!onboardingComplete) {
    // First screen: onboarding welcome (only once).
    if (!hasSeenWelcome) return <Redirect href="/(onboarding)/welcome" />;

    const city = onboardingCity ?? profile?.city ?? null;
    if (!city) return <Redirect href="/(onboarding)/set-city" />;

    // Spotify step is optional, but the screen must be visited (connect OR skip) to proceed.
    if (!spotifyStepCompleted) return <Redirect href="/(onboarding)/connect-spotify" />;

    // Select at least 3 artists to follow (or skip)
    if (!artistsStepCompleted) return <Redirect href="/(onboarding)/select-artists" />;

    // Presale preview "aha" moment (even if it returns empty)
    if (!presalePreviewShown) return <Redirect href="/(onboarding)/presale-preview" />;

    // Required gate before entering the app
    if (!hasLoggedFirstShow) return <Redirect href="/(onboarding)/log-first-show" />;

    return <Redirect href="/(onboarding)/find-friends" />;
  }

  // Required gate before entering the app
  if (!hasLoggedFirstShow) return <Redirect href="/(onboarding)/log-first-show" />;

  return <Redirect href="/(tabs)/feed" />;
}




