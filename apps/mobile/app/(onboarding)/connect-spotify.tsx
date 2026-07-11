// ONBOARDING · CONNECT SPOTIFY — value-prop card + the existing OAuth flow
// (unchanged): GET /auth/spotify/url → WebBrowser auth session → POST
// /auth/spotify/callback. finish() persists the step and moves to artists.

import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { apiClient } from '../../lib/api/client';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

const VALUE_PROPS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'sparkles-outline', label: 'Imports the artists you already love' },
  { icon: 'calendar-outline', label: 'Matches you to their upcoming shows' },
  { icon: 'ticket-outline', label: 'Flags presales before they sell out' },
];

export default function ConnectSpotifyOnboarding() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user, refresh } = useSession();
  const setSpotifyConnected = useOnboardingStore((s) => s.setSpotifyConnected);

  const [isLoading, setIsLoading] = useState(false);

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { flex: 1, paddingHorizontal: t.density.pad, paddingTop: 28, gap: 10 },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 21, marginBottom: 12 },
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: 6,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
    },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: t.colors.text },
    footer: { paddingHorizontal: t.density.pad, paddingBottom: 12, gap: 10 },
  }));

  const finish = async (connected: boolean) => {
    if (!user) return;
    // The onboarding store persists this locally; the Spotify link itself
    // lives server-side (surfaced via /auth/me hasSpotify).
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ProgressDots total={6} current={1} />
      </View>

      <View style={styles.body}>
        <Animated.Text entering={FadeInDown.duration(300)} style={styles.title}>
          Connect Spotify
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.subtitle}>
          The fastest way to set up your taste. We only read your top artists.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.card}>
          {VALUE_PROPS.map((vp, i) => (
            <View
              key={vp.label}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: 1, borderTopColor: tokens.colors.hairline },
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={vp.icon} size={19} color={tokens.colors.fg} />
              </View>
              <Text style={styles.rowLabel}>{vp.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.footer}>
        <PillButton
          title={isLoading ? 'Connecting…' : 'Connect Spotify'}
          size="lg"
          springFeedback
          haptic="light"
          disabled={isLoading}
          icon={isLoading ? <ActivityIndicator size="small" color={tokens.colors.inverseFg} /> : undefined}
          onPress={onConnect}
        />
        <PillButton
          title="Skip for now"
          variant="ghost"
          size="lg"
          springFeedback
          disabled={isLoading}
          onPress={() => void finish(false)}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
