import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { apiClient } from '../../lib/api/client';
import { updateProfile } from '../../lib/local/repo/profileRepo';
import { colors, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function ConnectSpotifyOnboarding() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const setSpotifyConnected = useOnboardingStore((s) => s.setSpotifyConnected);

  const [isLoading, setIsLoading] = useState(false);

  const finish = async (connected: boolean) => {
    if (!user) return;
    await updateProfile(user.id, { connectedMusic: connected });
    setSpotifyConnected(connected);
    await refresh();
    router.push('/(onboarding)/select-artists');
  };

  const onConnect = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/auth/spotify/url');
      const url = data?.url as string | undefined;
      if (!url) throw new Error('Missing Spotify URL');

      const redirectUrl = Linking.createURL('spotify-callback');
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type !== 'success' || !result.url) {
        // cancelled / dismissed
        setIsLoading(false);
        return;
      }

      const code = result.url.match(/code=([^&]*)/)?.[1];
      if (!code) throw new Error('Missing code in callback');

      const resp = await apiClient.post('/auth/spotify/callback', { code });
      const count = (resp.data?.topArtists?.length as number | undefined) ?? 0;

      await finish(true);
      Alert.alert('Spotify connected', `Synced ${count} top artists`);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      const status = e?.response?.status as number | undefined;
      if (status === 404 || status === 501) {
        Alert.alert(
          'Spotify not available',
          'This build does not have the Spotify connect endpoints enabled yet. You can skip for now.'
        );
      } else {
        Alert.alert('Could not connect Spotify', e?.response?.data?.error || e?.message || 'Unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.lg, gap: spacing.lg, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center' }}>
          <ProgressDots total={4} current={1} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '800' }}>Connect Spotify</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>We’ll use your top artists to personalize Discover.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Button label={isLoading ? 'Connecting…' : 'Connect Spotify'} disabled={isLoading} onPress={onConnect} />
          <Button label="Skip for now" variant="secondary" disabled={isLoading} onPress={() => finish(false)} />
        </View>
      </View>
    </Screen>
  );
}




