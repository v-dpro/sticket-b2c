import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { colors } from '../lib/theme';
import { useSession } from '../hooks/useSession';
import { useOnboardingStore } from '../stores/onboardingStore';

export default function Index() {
  const { user, profile, hasLoggedFirstShow, isLoading } = useSession();
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);
  const onboardingCity = useOnboardingStore((s) => s.city);
  const spotifyStepCompleted = useOnboardingStore((s) => s.spotifyStepCompleted);
  const artistsStepCompleted = useOnboardingStore((s) => s.artistsStepCompleted);
  const presalePreviewShown = useOnboardingStore((s) => s.presalePreviewShown);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const markArtistsStepCompleted = useOnboardingStore((s) => s.markArtistsStepCompleted);
  const checkOnboardingStatus = useOnboardingStore((s) => s.checkOnboardingStatus);

  const [ready, setReady] = useState(false);
  const [secureStoreComplete, setSecureStoreComplete] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await checkOnboardingStatus();
        const val = await SecureStore.getItemAsync('onboarding_complete');
        if (mounted) setSecureStoreComplete(val === 'true');

        // Auto-fix: if user progressed past artists step but state wasn't persisted
        const store = useOnboardingStore.getState();
        if (!store.artistsStepCompleted && store.currentStep > 3) {
          await store.markArtistsStepCompleted();
        }
      } catch {
        // Continue even if onboarding check fails — don't block the app
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [checkOnboardingStatus, markArtistsStepCompleted]);

  if (isLoading || !ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;

  // Fast-track: user has logged a show or completed onboarding → go to app
  const onboardingComplete =
    hasLoggedFirstShow ||
    Boolean(profile?.onboardingCompleted) ||
    hasCompletedOnboarding ||
    secureStoreComplete;

  if (onboardingComplete) return <Redirect href="/(tabs)/feed" />;

  // Onboarding gates (in order)
  if (!hasSeenWelcome) return <Redirect href="/(onboarding)/welcome" />;

  const city = onboardingCity ?? profile?.city ?? null;
  if (!city) return <Redirect href="/(onboarding)/set-city" />;

  if (!spotifyStepCompleted) return <Redirect href="/(onboarding)/connect-spotify" />;

  const hasProgressedPastArtists = presalePreviewShown || currentStep > 3;
  if (!artistsStepCompleted && !hasProgressedPastArtists) {
    return <Redirect href="/(onboarding)/select-artists" />;
  }

  if (!presalePreviewShown) return <Redirect href="/(onboarding)/presale-preview" />;
  if (!hasLoggedFirstShow) return <Redirect href="/(onboarding)/log-first-show" />;

  return <Redirect href="/(onboarding)/find-friends" />;
}
