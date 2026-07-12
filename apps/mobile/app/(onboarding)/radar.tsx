// ONBOARDING · PRESALE RADAR — the aha (A1), step 3 of the 3-step required
// lane. "We're already watching N presales for you": real presale rows for
// the user's followed artists (artist 700, mono date + live countdown), a
// mono "you'll get pinged" line, city folded in as an inline chip (A2), and
// primary "Enter Sticket" which completes the lane → /(tabs)/home.
//
// Data cascade — never an empty aha:
//   1. GET /presales/my-artists     — followed artists × upcoming presales
//                                     (server batches the artistId matching)
//   2. GET /users/me/artists        — zero presales → their artists' upcoming
//                                     shows ("N shows on sale now")
//   3. GET /presales (no artistId)  — worst case: the catalog's next on-sales
//
// The résumé lane (A3 backfill, A4 find-friends) is OFFERED here — tertiary
// buttons, never gates.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CityConfirmChip } from '../../components/onboarding/CityConfirmChip';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { monoDate } from '../../components/entity/format';
import { apiClient } from '../../lib/api/client';
import type { EventPresale } from '../../lib/api/events';
import { durations, haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

// What the radar found, best-first. 'armed' = nothing to show yet — the
// screen still renders a live "watching the wires" card, never a blank.
type RadarMode = 'presales' | 'shows' | 'catalog' | 'armed';

interface RadarRow {
  id: string;
  artistName: string;
  /** Event date — the mono chip. */
  dateIso: string;
  venueCity?: string;
  /** Presale window open — drives the countdown (absent in 'shows' mode). */
  presaleStart?: string;
}

// Subset of GET /users/me/artists entries the fallback needs.
interface MyArtistEntry {
  artist: { id: string; name: string };
  upcomingShows?: { id: string; date: string; venueName: string; venueCity: string }[];
}

const ROWS_SHOWN = 3;

/** "IN 2D 4H" / "IN 3H 12M" / "IN 45M" / "OPEN NOW" — mono countdown. */
function countdownLabel(targetIso: string, nowMs: number): string {
  const diff = new Date(targetIso).getTime() - nowMs;
  if (!Number.isFinite(diff)) return '';
  if (diff <= 0) return 'OPEN NOW';
  const totalMin = Math.floor(diff / 60_000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `IN ${d}D ${h}H`;
  if (h > 0) return `IN ${h}H ${m}M`;
  return `IN ${Math.max(1, m)}M`;
}

function presaleToRow(p: EventPresale): RadarRow {
  return {
    id: p.id,
    artistName: p.artistName,
    dateIso: p.eventDate,
    venueCity: p.venueCity,
    presaleStart: p.presaleStart,
  };
}

export default function PresaleRadarScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user, refresh } = useSession();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<RadarMode>('armed');
  const [rows, setRows] = useState<RadarRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Live countdown tick — cheap 30s cadence.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 1 — followed artists × upcoming presales (server-batched).
      const presales = await apiClient
        .get('/presales/my-artists')
        .then((r) => (Array.isArray(r.data) ? (r.data as EventPresale[]) : []))
        .catch(() => [] as EventPresale[]);
      if (!alive) return;
      if (presales.length > 0) {
        setMode('presales');
        setTotalCount(presales.length);
        setRows(presales.slice(0, ROWS_SHOWN).map(presaleToRow));
        setLoading(false);
        haptics.success(); // the aha lands
        return;
      }

      // 2 — zero presale matches → their artists' upcoming shows.
      const mine = await apiClient
        .get('/users/me/artists')
        .then((r) => r.data as { topTier?: MyArtistEntry[]; following?: MyArtistEntry[]; casual?: MyArtistEntry[] })
        .catch(() => null);
      if (!alive) return;
      const entries: MyArtistEntry[] = mine
        ? [...(mine.topTier ?? []), ...(mine.following ?? []), ...(mine.casual ?? [])]
        : [];
      const shows: RadarRow[] = entries
        .flatMap((e) =>
          (e.upcomingShows ?? []).map((s) => ({
            id: s.id,
            artistName: e.artist.name,
            dateIso: s.date,
            venueCity: s.venueCity,
          })),
        )
        .sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
      if (shows.length > 0) {
        setMode('shows');
        setTotalCount(shows.length);
        setRows(shows.slice(0, ROWS_SHOWN));
        setLoading(false);
        haptics.success();
        return;
      }

      // 3 — worst case: the catalog's next big on-sales. Never an empty aha.
      const catalog = await apiClient
        .get('/presales', { params: { limit: 12 } })
        .then((r) => (Array.isArray(r.data) ? (r.data as EventPresale[]) : []))
        .catch(() => [] as EventPresale[]);
      if (!alive) return;
      if (catalog.length > 0) {
        setMode('catalog');
        setTotalCount(catalog.length);
        setRows(catalog.slice(0, ROWS_SHOWN).map(presaleToRow));
      } else {
        setMode('armed');
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { paddingHorizontal: t.density.pad, paddingTop: 24, gap: 12, paddingBottom: 12 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.colors.accent,
    },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg, lineHeight: 36 },
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.hairline },
    artist: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    rowMeta: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 0.4,
      color: t.colors.mute,
      marginTop: 3,
    },
    countdown: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.6,
      color: t.colors.accent,
    },
    onsale: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 1,
      color: t.colors.fg,
    },
    pingLine: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 17,
    },
    armedCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    armedIcon: {
      width: 44,
      height: 44,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
    },
    armedText: {
      fontSize: 14,
      fontWeight: '400',
      color: t.colors.mute,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingWrap: { paddingVertical: 48, alignItems: 'center', gap: 12 },
    loadingText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    footer: { paddingHorizontal: t.density.pad, paddingTop: 12, paddingBottom: 12, gap: 10 },
  }));

  const title = useMemo(() => {
    switch (mode) {
      case 'presales':
        return `We’re already watching ${totalCount} presale${totalCount === 1 ? '' : 's'} for you`;
      case 'shows':
        return `${totalCount} show${totalCount === 1 ? '' : 's'} on sale now for your artists`;
      case 'catalog':
        return 'The next big on-sales, on your radar';
      case 'armed':
        return 'Your radar is armed';
    }
  }, [mode, totalCount]);

  const pingLine =
    mode === 'shows'
      ? 'We’ll ping you the moment a presale opens'
      : 'You’ll get pinged when each one opens';

  const finish = async () => {
    if (!user || finishing) return;
    setFinishing(true);
    try {
      // Completing the 3-step lane — this is what unblocks the app/index gate.
      await completeOnboarding();
      await refresh();
      haptics.success();
      router.replace('/(tabs)/home');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ProgressDots total={3} current={2} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.duration(300)} style={styles.eyebrow}>
          Presale radar
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(50).duration(300)} style={styles.title}>
          {loading ? 'Scanning the wires…' : title}
        </Animated.Text>

        {/* A2 — city inline: inferred chip + one-tap picker sheet. Skippable. */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <CityConfirmChip />
        </Animated.View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={tokens.colors.mute} />
            <Text style={styles.loadingText}>Matching your artists</Text>
          </View>
        ) : mode === 'armed' ? (
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.armedCard}>
            <View style={styles.armedIcon}>
              <Ionicons name="radio-outline" size={22} color={tokens.colors.fg} />
            </View>
            <Text style={styles.armedText}>
              We’re watching the wires for your artists. The moment a presale window opens, it lands
              here — and on your lock screen.
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.card}>
            {rows.map((row, i) => (
              <View key={row.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Animated.View
                  entering={FadeInDown.delay(180 + i * durations.stagger).duration(280)}
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.artist} numberOfLines={1}>
                      {row.artistName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {monoDate(row.dateIso)}
                      {row.venueCity ? ` · ${row.venueCity.toUpperCase()}` : ''}
                    </Text>
                  </View>
                  {row.presaleStart ? (
                    <Text style={styles.countdown}>{countdownLabel(row.presaleStart, nowMs)}</Text>
                  ) : (
                    <Text style={styles.onsale}>ON SALE</Text>
                  )}
                </Animated.View>
              </View>
            ))}
          </Animated.View>
        )}

        {!loading ? (
          <Animated.Text entering={FadeInDown.delay(300).duration(300)} style={styles.pingLine}>
            {pingLine}
          </Animated.Text>
        ) : null}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(360).duration(300)} style={styles.footer}>
        <PillButton
          title={finishing ? 'Finishing…' : 'Enter Sticket'}
          size="lg"
          springFeedback
          haptic="medium"
          disabled={finishing}
          icon={finishing ? <ActivityIndicator size="small" color={tokens.colors.inverseFg} /> : undefined}
          onPress={() => void finish()}
        />
        {/* Résumé lane (optional, A3 + A4) — offered after the aha, never gates. */}
        <PillButton
          title="Add your past shows (2 min)"
          variant="secondary"
          size="lg"
          springFeedback
          haptic="light"
          disabled={finishing}
          onPress={() => router.push('/(onboarding)/backfill')}
        />
        <PillButton
          title="Find your people"
          variant="ghost"
          size="lg"
          springFeedback
          disabled={finishing}
          onPress={() => router.push('/(onboarding)/find-friends')}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
