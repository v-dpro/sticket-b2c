// ONBOARDING · PRESALE PREVIEW — sells the presale-intel feature with a
// realistic mock match, reusing components/entity/PresaleCard (import-only)
// for the presale window/code. Continue best-effort persists follows and
// marks the step, then → log-first-show.

import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { PresaleCard } from '../../components/entity/PresaleCard';
import { apiClient } from '../../lib/api/client';
import type { EventPresale } from '../../lib/api/events';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useOnboardingStore } from '../../stores/onboardingStore';

const DAY = 86_400_000;

export default function PresalePreviewScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const selectedArtists = useOnboardingStore((s) => s.selectedArtists);
  const city = useOnboardingStore((s) => s.city);
  const markPresalePreviewShown = useOnboardingStore((s) => s.markPresalePreviewShown);

  const [saving, setSaving] = useState(false);

  const headliner = selectedArtists[0];
  const artistName = headliner?.name ?? 'Your favorite artist';
  const artistImage = headliner?.imageUrl;

  const mockPresales: EventPresale[] = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: 'preview-presale',
        artistName,
        tourName: 'World Tour 2026',
        venueName: 'Madison Square Garden',
        venueCity: city ?? 'New York',
        venueState: null,
        eventDate: new Date(now + 62 * DAY).toISOString(),
        presaleType: 'Artist',
        presaleStart: new Date(now + 2 * DAY).toISOString(),
        presaleEnd: new Date(now + 3 * DAY).toISOString(),
        onsaleStart: new Date(now + 4 * DAY).toISOString(),
        code: 'ENCORE26',
        signupUrl: null,
        ticketUrl: null,
        notes: 'Your code unlocks the fan presale 24h before general sale.',
      },
    ];
  }, [artistName, city]);

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { paddingHorizontal: t.density.pad, paddingTop: 24, gap: 12 },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 21, marginBottom: 6 },
    matchCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      gap: 12,
    },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.colors.accent,
    },
    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.colors.card2 },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: '700', color: t.colors.mute },
    artist: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    tour: { fontSize: 13, fontWeight: '400', color: t.colors.mute, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { fontSize: 13, fontWeight: '500', color: t.colors.textSoft },
    note: { fontSize: 13, fontWeight: '400', color: t.colors.mute, lineHeight: 19, textAlign: 'center', marginTop: 4 },
    footer: { paddingHorizontal: t.density.pad, paddingTop: 12, paddingBottom: 12 },
  }));

  const eventDateLabel = useMemo(() => {
    const d = new Date(mockPresales[0].eventDate);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [mockPresales]);

  const persistFollowsIfNeeded = async () => {
    if (selectedArtists.length === 0) return;
    // Idempotent: server uses upserts.
    await apiClient.post('/users/me/artists/bulk-follow', {
      artists: selectedArtists.map((a) => ({
        spotifyId: a.spotifyId,
        name: a.name,
        imageUrl: a.imageUrl,
        genres: a.genres,
        tier: a.tier,
      })),
    });
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await persistFollowsIfNeeded();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to bulk-follow during onboarding:', e);
      // Proceed anyway; onboarding should not hard-block on this.
    } finally {
      markPresalePreviewShown();
      setSaving(false);
      router.push('/(onboarding)/log-first-show');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ProgressDots total={6} current={3} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.duration(300)} style={styles.title}>
          Never miss a presale
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.subtitle}>
          The moment tickets for your artists open, we surface the window and the code. Here’s what
          that looks like.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.matchCard}>
          <Text style={styles.eyebrow}>Presale match</Text>
          <View style={styles.matchRow}>
            {artistImage ? (
              <Image source={{ uri: artistImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{artistName.trim()[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.artist} numberOfLines={1}>
                {artistName}
              </Text>
              <Text style={styles.tour}>{mockPresales[0].tourName}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={tokens.colors.mute} />
            <Text style={styles.meta} numberOfLines={1}>
              {mockPresales[0].venueName}, {mockPresales[0].venueCity} · {eventDateLabel}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <PresaleCard presales={mockPresales} />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(240).duration(300)} style={styles.note}>
          You’ll get a heads-up the moment this goes live.
        </Animated.Text>
      </ScrollView>

      <View style={styles.footer}>
        <PillButton
          title={saving ? 'Setting up…' : 'Continue'}
          size="lg"
          springFeedback
          haptic="light"
          disabled={saving}
          onPress={() => void handleContinue()}
        />
      </View>
    </SafeAreaView>
  );
}
