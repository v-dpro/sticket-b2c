// ONBOARDING · BACKFILL — A3, the résumé lane (optional, never a gate).
// Recognition cards: "Were you at {Artist} — {Venue}, {Mon YYYY}?" generated
// from the CATALOG (top followed artists × their past events, newest first,
// cap 12). YES logs it UNSCORED via the existing createLog — no compare
// interruption mid-run; NO/skip advances. Swipe (pan right = yes, left = no)
// or tap. After the run: "N shows added — score them from your timeline"
// (tapping an unscored log opens /log/compare via its logId); the CTA goes
// to /(tabs)/you. Reachable from the radar/done screens and You's empty state.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { getArtistShows } from '../../lib/api/artists';
import { apiClient } from '../../lib/api/client';
import { createLog } from '../../lib/api/logs';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useOnboardingStore } from '../../stores/onboardingStore';

interface BackfillCard {
  eventId: string;
  artistName: string;
  venueName: string;
  venueCity: string;
  dateIso: string;
}

// Subset of GET /users/me/artists entries this screen needs.
interface MyArtistEntry {
  artist: { id: string; name: string };
}

const MAX_CARDS = 12; // cap per spec
const TOP_ARTISTS = 6; // top followed/imported artists to scan
const PAST_PER_ARTIST = 4; // past cat-events pulled per artist
const SWIPE_THRESHOLD = 90; // px of pan travel that commits an answer
const EXIT_MS = 200; // card fly-out duration

/** ISO → "Mar 2024" for the card question. */
function monYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function BackfillScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<BackfillCard[]>([]);
  const [index, setIndex] = useState(0);
  const [added, setAdded] = useState(0);
  const [finishing, setFinishing] = useState(false);
  // Guard: one answer per card (a swipe commit + tap race would double-log).
  const answeredIndex = useRef(-1);

  // ── Card data: top followed artists × their past catalog events ──
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mine = await apiClient
          .get('/users/me/artists')
          .then((r) => r.data as { topTier?: MyArtistEntry[]; following?: MyArtistEntry[]; casual?: MyArtistEntry[] })
          .catch(() => null);
        const artists: MyArtistEntry[] = mine
          ? [...(mine.topTier ?? []), ...(mine.following ?? []), ...(mine.casual ?? [])].slice(0, TOP_ARTISTS)
          : [];

        const results = await Promise.allSettled(
          artists.map((e) => getArtistShows(e.artist.id, { upcoming: false, limit: PAST_PER_ARTIST })),
        );

        const seen = new Set<string>();
        const out: BackfillCard[] = [];
        results.forEach((res, i) => {
          if (res.status !== 'fulfilled' || !Array.isArray(res.value)) return;
          const artistName = artists[i]?.artist.name ?? '';
          for (const show of res.value) {
            if (show.userLogged) continue; // already on their timeline
            if (seen.has(show.id)) continue;
            seen.add(show.id);
            out.push({
              eventId: show.id,
              artistName,
              venueName: show.venue?.name ?? '',
              venueCity: show.venue?.city ?? '',
              dateIso: show.date,
            });
          }
        });

        out.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime()); // newest first
        if (alive) setCards(out.slice(0, MAX_CARDS));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Swipe mechanics — pan right = yes, left = no; or tap the pills ──
  const translateX = useSharedValue(0);

  const answer = useCallback(
    (yes: boolean, forIndex: number) => {
      if (answeredIndex.current >= forIndex) return; // already answered
      answeredIndex.current = forIndex;
      const card = cards[forIndex];
      if (yes && card) {
        haptics.medium();
        setAdded((n) => n + 1);
        // Unscored log — no compare interruption mid-run (scoring happens
        // later from the timeline: tapping an unscored log opens compare).
        createLog({ eventId: card.eventId }).catch(() => {
          setAdded((n) => Math.max(0, n - 1));
        });
      } else {
        haptics.light();
      }
      translateX.value = 0; // reset for the next card
      setIndex(forIndex + 1);
    },
    [cards, translateX],
  );

  /** Fly the card off-screen, then commit the answer. */
  const commit = useCallback(
    (yes: boolean) => {
      const forIndex = index;
      translateX.value = withTiming(
        yes ? screenW : -screenW,
        { duration: EXIT_MS },
        (finished) => {
          if (finished) runOnJS(answer)(yes, forIndex);
        },
      );
    },
    [answer, index, screenW, translateX],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .onUpdate((e) => {
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          if (e.translationX > SWIPE_THRESHOLD) {
            translateX.value = withTiming(screenW, { duration: EXIT_MS }, (finished) => {
              if (finished) runOnJS(answer)(true, index);
            });
          } else if (e.translationX < -SWIPE_THRESHOLD) {
            translateX.value = withTiming(-screenW, { duration: EXIT_MS }, (finished) => {
              if (finished) runOnJS(answer)(false, index);
            });
          } else {
            translateX.value = withSpring(0, { stiffness: 260, damping: 20 });
          }
        }),
    [answer, index, screenW, translateX],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${translateX.value / 24}deg` },
    ],
  }));
  const yesHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));
  const noHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { flex: 1, paddingHorizontal: t.density.pad, paddingTop: 24, gap: 12 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.colors.accent,
    },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 21 },
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.xl,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad + 6,
      gap: 8,
      marginTop: 10,
      ...t.shadows.card,
    },
    cardDate: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    cardLead: { fontSize: 15, fontWeight: '400', color: t.colors.mute, marginTop: 6 },
    cardArtist: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: t.colors.fg },
    cardVenue: { fontSize: 15, fontWeight: '600', color: t.colors.textSoft },
    hint: {
      position: 'absolute',
      top: 14,
      fontFamily: t.fontFamilies.monoBold,
      fontSize: 12,
      letterSpacing: 2,
    },
    hintYes: { left: 16, color: t.colors.success },
    hintNo: { right: 16, color: t.colors.mute },
    swipeNote: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.textLo,
      textAlign: 'center',
      marginTop: 12,
    },
    addedCounter: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: t.colors.mute,
      marginTop: 2,
    },
    answerRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
    doneMark: {
      width: 56,
      height: 56,
      borderRadius: t.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
    },
    doneTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: t.colors.fg, textAlign: 'center' },
    doneSub: { fontSize: 15, fontWeight: '400', color: t.colors.mute, textAlign: 'center', lineHeight: 22 },
    footer: { paddingHorizontal: t.density.pad, paddingTop: 12, paddingBottom: 12, gap: 10 },
  }));

  const card = cards[index];
  const finished = !loading && (cards.length === 0 || index >= cards.length);

  // Leaving the résumé lane for the timeline — make sure the required lane is
  // marked complete (idempotent when entered post-onboarding from You).
  const exitToTimeline = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await completeOnboarding();
      router.replace('/(tabs)/you');
    } finally {
      setFinishing(false);
    }
  };

  const closeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
          <Text style={styles.doneSub}>Digging through the archives…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary (or nothing to confirm) ──
  if (finished) {
    const foundNothing = cards.length === 0;
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
          <View style={styles.doneMark}>
            <Ionicons
              name={added > 0 ? 'checkmark' : 'time-outline'}
              size={26}
              color={tokens.colors.fg}
            />
          </View>
          <Text style={styles.doneTitle}>
            {foundNothing
              ? 'Nothing to confirm yet'
              : added > 0
                ? `${added} show${added === 1 ? '' : 's'} added`
                : 'All caught up'}
          </Text>
          <Text style={styles.doneSub}>
            {foundNothing
              ? 'As your artists’ history fills in, we’ll surface shows you might have been at.'
              : added > 0
                ? 'They’re on your timeline unscored — score them any time by tapping one.'
                : 'You can always log past shows from the You tab — past shows count.'}
          </Text>
        </Animated.View>
        <View style={styles.footer}>
          {added > 0 ? (
            <PillButton
              title={finishing ? 'Opening…' : 'Score them from your timeline'}
              size="lg"
              springFeedback
              haptic="medium"
              disabled={finishing}
              onPress={() => void exitToTimeline()}
            />
          ) : null}
          <PillButton
            title="Done"
            variant={added > 0 ? 'ghost' : 'primary'}
            size="lg"
            springFeedback
            haptic="light"
            disabled={finishing}
            onPress={closeBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── The recognition card run ──
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ProgressDots total={cards.length} current={index} />
      </View>

      <View style={styles.body}>
        <Animated.Text entering={FadeInDown.duration(300)} style={styles.eyebrow}>
          Backfill
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(50).duration(300)} style={styles.title}>
          Were you there?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.subtitle}>
          Quick yes or no — we pulled shows your top artists played.
        </Animated.Text>
        {added > 0 ? <Text style={styles.addedCounter}>{added} ADDED</Text> : null}

        {card ? (
          <GestureDetector gesture={pan}>
            <Animated.View key={card.eventId} entering={FadeInDown.duration(260)} style={cardStyle}>
              <View style={styles.card}>
                <Animated.Text style={[styles.hint, styles.hintYes, yesHintStyle]}>YES</Animated.Text>
                <Animated.Text style={[styles.hint, styles.hintNo, noHintStyle]}>NO</Animated.Text>
                <Text style={styles.cardDate}>{monYear(card.dateIso)}</Text>
                <Text style={styles.cardLead}>Were you at</Text>
                <Text style={styles.cardArtist} numberOfLines={2}>
                  {card.artistName}
                </Text>
                <Text style={styles.cardVenue} numberOfLines={2}>
                  {card.venueName}
                  {card.venueCity ? ` · ${card.venueCity}` : ''}
                </Text>
              </View>
            </Animated.View>
          </GestureDetector>
        ) : null}

        <Text style={styles.swipeNote}>Swipe right for yes · left for no</Text>

        <View style={styles.answerRow}>
          <View style={{ flex: 1 }}>
            <PillButton
              title="Nope"
              variant="ghost"
              size="lg"
              springFeedback
              haptic="none" // answer() fires the tiered haptic
              onPress={() => commit(false)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PillButton
              title="I was there"
              size="lg"
              springFeedback
              haptic="none" // answer() fires the tiered haptic
              onPress={() => commit(true)}
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PillButton
          title="I’m done"
          variant="ghost"
          size="md"
          springFeedback
          onPress={() => {
            answeredIndex.current = cards.length;
            setIndex(cards.length);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
