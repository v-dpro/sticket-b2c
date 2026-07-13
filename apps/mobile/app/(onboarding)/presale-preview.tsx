// ONBOARDING · PRESALE PREVIEW — sells the presale-intel feature with a REAL
// presale match for the artists the user just picked. Fetches
// POST /onboarding/presale-preview (via getOnboardingPresalePreview) and
// renders the first match through components/entity/PresaleCard (window/code),
// with graceful loading / empty / error states so the step never hard-blocks.
// Continue best-effort persists follows and marks the step → log-first-show.
//
// NOTE: this screen is registered in the onboarding Stack but is NOT part of
// the shipped 3-step required lane (welcome → connect-spotify → radar → home;
// see app/index.tsx). It belongs to the older/optional résumé flow and is only
// reached if something pushes to it — wired here for correctness regardless.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { PresaleCard } from '../../components/entity/PresaleCard';
import { apiClient } from '../../lib/api/client';
import {
  getOnboardingPresalePreview,
  type EventPresale,
  type OnboardingPresalePreviewItem,
} from '../../lib/api/events';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useOnboardingStore } from '../../stores/onboardingStore';

type FetchStatus = 'loading' | 'ready' | 'error';

// The preview endpoint returns a narrower row than the entity PresaleCard
// expects — fill the fields it doesn't send so the card renders (it only reads
// presaleType / presaleStart / presaleEnd / code / notes).
function toEventPresale(p: OnboardingPresalePreviewItem): EventPresale {
  return {
    id: p.id,
    artistName: p.artistName,
    tourName: p.tourName ?? null,
    venueName: p.venueName,
    venueCity: p.venueCity,
    venueState: null,
    eventDate: p.presaleStart,
    presaleType: p.presaleType,
    presaleStart: p.presaleStart,
    presaleEnd: null,
    onsaleStart: null,
    // Compliance: we never redistribute presale codes. Force null so the card
    // shows only the presale NAME (presaleType) + WINDOW, never a code chip —
    // regardless of what the endpoint returns.
    code: null,
    signupUrl: p.signupUrl ?? null,
    ticketUrl: null,
    notes: null,
  };
}

export default function PresalePreviewScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const selectedArtists = useOnboardingStore((s) => s.selectedArtists);
  const markPresalePreviewShown = useOnboardingStore((s) => s.markPresalePreviewShown);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [presales, setPresales] = useState<EventPresale[]>([]);

  useEffect(() => {
    let alive = true;
    const names = selectedArtists.map((a) => a.name).filter(Boolean);
    if (names.length === 0) {
      setStatus('ready');
      setPresales([]);
      return;
    }
    (async () => {
      try {
        const res = await getOnboardingPresalePreview(names);
        if (!alive) return;
        setPresales(res.presales.map(toEventPresale));
        setStatus('ready');
      } catch (e) {
        if (!alive) return;
        // eslint-disable-next-line no-console
        console.error('Failed to load onboarding presale preview:', e);
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedArtists]);

  const headliner = presales[0];
  const headlinerName = headliner?.artistName ?? selectedArtists[0]?.name ?? 'Your favorite artist';
  const headlinerImage = useMemo(() => {
    if (headliner) {
      const match = selectedArtists.find(
        (a) => a.name.toLowerCase() === headliner.artistName.toLowerCase(),
      );
      if (match?.imageUrl) return match.imageUrl;
    }
    return selectedArtists[0]?.imageUrl;
  }, [headliner, selectedArtists]);

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
    // Loading / empty / error — a calm card that still sells the feature.
    stateCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      alignItems: 'center',
      gap: 12,
    },
    stateIcon: {
      width: 44,
      height: 44,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
    },
    stateText: {
      fontSize: 14,
      fontWeight: '400',
      color: t.colors.mute,
      textAlign: 'center',
      lineHeight: 20,
    },
    footer: { paddingHorizontal: t.density.pad, paddingTop: 12, paddingBottom: 12 },
  }));

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

  const hasMatch = status === 'ready' && presales.length > 0;

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

        {status === 'loading' ? (
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.stateCard}>
            <ActivityIndicator color={tokens.colors.mute} />
            <Text style={styles.stateText}>Scanning presales for your artists…</Text>
          </Animated.View>
        ) : hasMatch ? (
          <>
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.matchCard}>
              <Text style={styles.eyebrow}>Presale match</Text>
              <View style={styles.matchRow}>
                {headlinerImage ? (
                  <Image source={{ uri: headlinerImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {headlinerName.trim()[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.artist} numberOfLines={1}>
                    {headlinerName}
                  </Text>
                  {headliner?.tourName ? (
                    <Text style={styles.tour}>{headliner.tourName}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={tokens.colors.mute} />
                <Text style={styles.meta} numberOfLines={1}>
                  {headliner.venueName}
                  {headliner.venueCity ? `, ${headliner.venueCity}` : ''}
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(180).duration(300)}>
              <PresaleCard presales={presales.slice(0, 3)} />
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(240).duration(300)} style={styles.note}>
              You’ll get a heads-up the moment this goes live.
            </Animated.Text>
          </>
        ) : (
          // No matches yet, or the fetch failed — still reassure & let them on.
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="radio-outline" size={22} color={tokens.colors.fg} />
            </View>
            <Text style={styles.stateText}>
              {status === 'error'
                ? 'We couldn’t load presales right now — but your radar is armed. The moment one opens for your artists, it lands here and on your lock screen.'
                : 'No live presales for your artists yet. Your radar is armed — the moment one opens, it lands here and on your lock screen.'}
            </Text>
          </Animated.View>
        )}
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
