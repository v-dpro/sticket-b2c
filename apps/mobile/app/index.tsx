import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { useTheme } from '../lib/theme-context';
import { useSession } from '../hooks/useSession';
import { useOnboardingStore } from '../stores/onboardingStore';

export default function Index() {
  const { tokens } = useTheme();
  const { user, profile, hasLoggedFirstShow, isLoading } = useSession();
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);
  const spotifyStepCompleted = useOnboardingStore((s) => s.spotifyStepCompleted);
  const spotifyConnected = useOnboardingStore((s) => s.spotifyConnected);
  const artistsStepCompleted = useOnboardingStore((s) => s.artistsStepCompleted);
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
      } catch {
        // Continue even if onboarding check fails — don't block the app
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [checkOnboardingStatus]);

  if (isLoading || !ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.colors.bg }}>
        <ActivityIndicator color={tokens.colors.mute} />
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

  if (onboardingComplete) return <Redirect href="/(tabs)/home" />;

  // ── THE REQUIRED UTILITY LANE (Phase A · A5) — exactly 3 steps ──
  //   1. welcome
  //   2. connect Spotify (or skip)
  //   3. PRESALE RADAR — the aha, with city folded in inline (A1 + A2).
  //      Reaching "Enter Sticket" on the radar calls completeOnboarding(),
  //      which flips the onboardingComplete fast-track above.
  //
  // Everything else — backfill (A3), find-friends (A4) — is the OPTIONAL
  // résumé lane, offered FROM the radar. Those steps are no longer gates:
  // the store still keeps their fields (city / artists / presalePreview /
  // firstShow / findFriends), they simply stop routing here.
  if (!hasSeenWelcome) return <Redirect href="/(onboarding)/welcome" />;
  if (!spotifyStepCompleted) return <Redirect href="/(onboarding)/connect-spotify" />;

  // Minimal artist-pick fallback lives INSIDE the lane, only when Spotify is
  // skipped (a connected user is auto-followed to their top artists server-
  // side, so the radar already has data).
  if (!spotifyConnected && !artistsStepCompleted) {
    return <Redirect href="/(onboarding)/select-artists" />;
  }

  return <Redirect href="/(onboarding)/radar" />;
}
