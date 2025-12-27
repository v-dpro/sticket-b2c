import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const markArtistsStepCompleted = useOnboardingStore((s) => s.markArtistsStepCompleted);
  const checkOnboardingStatus = useOnboardingStore((s) => s.checkOnboardingStatus);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [secureStoreOnboardingComplete, setSecureStoreOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        // Check both AsyncStorage (onboarding store) and SecureStore
        await checkOnboardingStatus();
        const secureComplete = await SecureStore.getItemAsync('onboarding_complete');
        if (mounted) {
          setSecureStoreOnboardingComplete(secureComplete === 'true');
        }
      } catch {
        // Ignore errors
      } finally {
        if (mounted) setCheckingOnboarding(false);
      }
    };
    void loadAll();
    return () => {
      mounted = false;
    };
  }, [checkOnboardingStatus]);

  // Auto-complete artists step if user has progressed past it
  useEffect(() => {
    if (!checkingOnboarding && !artistsStepCompleted && currentStep > 3) {
      void markArtistsStepCompleted();
    }
  }, [checkingOnboarding, artistsStepCompleted, currentStep, markArtistsStepCompleted]);

  if (isLoading || checkingOnboarding || secureStoreOnboardingComplete === null) {
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

  // If onboarding is marked as complete (from any source), go to app
  const onboardingComplete = Boolean(profile?.onboardingCompleted) || hasCompletedOnboarding || secureStoreOnboardingComplete;
  if (onboardingComplete) {
    return <Redirect href="/(tabs)/feed" />;
  }

  // Gate: onboarding (welcome -> city -> spotify -> artists -> presale preview -> first log -> friends -> done)
  // First screen: onboarding welcome (only once).
  if (!hasSeenWelcome) return <Redirect href="/(onboarding)/welcome" />;

  const city = onboardingCity ?? profile?.city ?? null;
  if (!city) return <Redirect href="/(onboarding)/set-city" />;

  // Spotify step is optional, but the screen must be visited (connect OR skip) to proceed.
  if (!spotifyStepCompleted) return <Redirect href="/(onboarding)/connect-spotify" />;

  // Select at least 3 artists to follow (or skip)
  // If user has seen presale preview, logged a show, or progressed past step 3, they've passed this step
  // Also check if they've completed other steps after this one
  const hasProgressedPastArtists = presalePreviewShown || hasLoggedFirstShow || currentStep > 3;
  if (!artistsStepCompleted && !hasProgressedPastArtists) {
    return <Redirect href="/(onboarding)/select-artists" />;
  }
  
  // Auto-fix: if user has progressed past but state wasn't saved, fix it now
  if (!artistsStepCompleted && hasProgressedPastArtists) {
    void markArtistsStepCompleted();
  }

  // Presale preview "aha" moment (even if it returns empty)
  if (!presalePreviewShown) return <Redirect href="/(onboarding)/presale-preview" />;

  // Required gate before entering the app
  if (!hasLoggedFirstShow) return <Redirect href="/(onboarding)/log-first-show" />;

  return <Redirect href="/(onboarding)/find-friends" />;
}




