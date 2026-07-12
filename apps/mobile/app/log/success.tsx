// LOG FLOW · STEP 4 — THE REVEAL. Locked choreography (durations.reveal):
//   0.0s  bg + event name, small and mute
//   0.3s  score digits count up (SpringNumber, one decimal) — the numeral
//         wears the brand gradient via MaskedView for ~durations.milestoneFlash,
//         then settles to fg.
//   1.2s  the stamp LANDS — the giant ScoreStamp border slams around the
//         digits (scale 1.3→1, rotate −8°→−3°, springs.stamp) + medium haptic
//   1.8s  "#N OF M" + "+N XP" bordered mono chips pop + thin level bar nudges
//   2.4s  ONE milestone card (first new badge) + confetti + success haptic
//   3.2s  CTA row fades in — primary "Make it a memory", ghost "Done for tonight"
// Tap anywhere earlier skips every pending phase straight to the CTA state.
// Route contract in: { eventId?, eventName?, score?, rank?, totalScored?,
//   xpGain?, xpAfter?, leveledUp?, badges? } — score/rank optional so older
// callers (and 409 fallbacks) still get a dignified reveal.

import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { saveMemoryForMorning } from '../../components/log/memoryDraft';
import { Confetti } from '../../components/ui/Confetti';
import { PillButton } from '../../components/ui/PillButton';
import { SpringNumber } from '../../components/ui/SpringNumber';
import { getEvent } from '../../lib/api/events';
import { levelFor } from '../../lib/game';
import { durations, haptics, springs } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';

// Phase indices: 1 score · 2 rank · 3 xp · 4 milestone · 5 cta
const FINAL_PHASE = 5;

type RevealBadge = { id: string; name: string; icon: string; description: string };

function parseBadges(raw?: string): RevealBadge[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((b) => b && typeof b.id === 'string')
      .map((b) => ({
        id: b.id as string,
        name: typeof b.name === 'string' && b.name ? b.name : String(b.id),
        icon: typeof b.icon === 'string' && b.icon ? b.icon : '🏅',
        description: typeof b.description === 'string' ? b.description : '',
      }));
  } catch {
    return [];
  }
}

export default function LogSuccess() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;

  const params = useLocalSearchParams<{
    logId?: string;
    eventId?: string;
    eventName?: string;
    venueId?: string;
    venueName?: string;
    section?: string;
    row?: string;
    seat?: string;
    score?: string;
    rank?: string;
    totalScored?: string;
    xpGain?: string;
    xpAfter?: string;
    leveledUp?: string;
    badges?: string;
  }>();

  const score = Number(params.score);
  const hasScore = Number.isFinite(score);
  const rank = Number(params.rank);
  const totalScored = Number(params.totalScored);
  const hasRank = Number.isFinite(rank) && Number.isFinite(totalScored);
  const xpGain = Number(params.xpGain);
  const xpAfter = Number(params.xpAfter);
  const hasXp = Number.isFinite(xpGain) && Number.isFinite(xpAfter);
  const leveledUp = params.leveledUp === '1' || params.leveledUp === 'true';
  const badge = useMemo(() => parseBadges(params.badges)[0] ?? null, [params.badges]);

  // Event name: param-first; fetch only as a fallback for older callers.
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  useEffect(() => {
    if (params.eventName || !params.eventId) return;
    let alive = true;
    getEvent(String(params.eventId))
      .then((e) => {
        if (alive) setFetchedName(e.name);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [params.eventName, params.eventId]);
  const eventName = params.eventName ? String(params.eventName) : fetchedName ?? '';

  // A9: between 20:00 and 04:00 the primary CTA defers to a morning reminder.
  // Snapshot once on mount so it can't flip mid-reveal.
  const [isNight] = useState(() => {
    const h = new Date().getHours();
    return h >= 20 || h < 4;
  });

  // ── Phase machine ──
  const [phase, setPhase] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const at = (ms: number, fn: () => void) => timersRef.current.push(setTimeout(fn, ms));
    const bump = (p: number) => () => setPhase((prev) => Math.max(prev, p));
    const hasBadge = Boolean(badge);
    at(durations.reveal.intro, bump(1));
    // With a score, the stamp landing (StampedScore) owns the medium haptic;
    // the score-less "Logged." keeps the original settle beat.
    if (!hasScore) at(durations.reveal.intro + 800, () => haptics.medium());
    at(durations.reveal.stamp, bump(2));
    at(durations.reveal.details, bump(3));
    if (hasBadge) {
      // A8: real threshold reached — the 2.4s milestone beat plays in full.
      at(durations.reveal.stats, bump(4));
      at(durations.reveal.cta, bump(5));
    } else {
      // A8: no badge → the rank stamp is the finale. Skip the milestone beat
      // and bring the CTAs up to ~2.6s.
      at(durations.reveal.stats + 200, bump(5));
    }
    return () => timersRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase >= FINAL_PHASE) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSkipped(true);
    setPhase(FINAL_PHASE);
  };

  // Milestone side effects — once, when the card becomes visible.
  const milestoneVisible = phase >= 4 && Boolean(badge);
  const milestoneFired = useRef(false);
  useEffect(() => {
    if (milestoneVisible && !milestoneFired.current) {
      milestoneFired.current = true;
      haptics.success();
    }
  }, [milestoneVisible]);

  const done = () => router.replace('/(tabs)/you');
  const canMakeMemory = Boolean(params.logId);

  // A9: defer the memory to the morning — persist a draft + schedule the 10:00
  // reminder (both best-effort/silent), then bow out to the timeline.
  const saveForMorning = () => {
    haptics.light();
    void saveMemoryForMorning({
      logId: String(params.logId),
      eventId: params.eventId ? String(params.eventId) : undefined,
      eventName: eventName || undefined,
    });
    router.replace('/(tabs)/you');
  };
  const makeMemory = () =>
    router.push({
      pathname: '/log/memory',
      params: {
        ...(params.logId ? { logId: String(params.logId) } : {}),
        ...(params.eventId ? { eventId: String(params.eventId) } : {}),
        ...(eventName ? { eventName } : {}),
        ...(params.venueId ? { venueId: String(params.venueId) } : {}),
        ...(params.venueName ? { venueName: String(params.venueName) } : {}),
        ...(params.section ? { section: String(params.section) } : {}),
        ...(params.row ? { row: String(params.row) } : {}),
        ...(params.seat ? { seat: String(params.seat) } : {}),
      },
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Pressable style={{ flex: 1 }} onPress={skip} accessibilityLabel="Skip reveal">
        <View style={{ flex: 1, paddingHorizontal: pad }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* 0.0s — event name, small and mute */}
            <Text
              style={{ color: c.mute, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 20 }}
              numberOfLines={2}
            >
              {eventName}
            </Text>

            {/* 0.3s — digits count up · 1.2s — the stamp lands around them */}
            <View style={{ height: 156, justifyContent: 'center' }}>
              {phase >= 1 ? (
                hasScore ? (
                  <StampedScore score={score} stamped={phase >= 2} instant={skipped} />
                ) : (
                  <Animated.Text
                    entering={ZoomIn.springify().stiffness(260).damping(18)}
                    style={{ color: c.fg, fontSize: 44, fontWeight: '800', letterSpacing: -1 }}
                  >
                    Logged.
                  </Animated.Text>
                )
              ) : null}
            </View>

            {/* 1.8s — "#N OF M" + "+N XP" bordered mono chips + level bar nudge */}
            <View
              style={{
                height: hasXp ? 108 : hasRank ? 44 : 0,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {phase >= 3 && (hasRank || hasXp) ? (
                <View style={{ alignItems: 'center', gap: 16 }}>
                  <Animated.View
                    entering={ZoomIn.springify().stiffness(260).damping(18)}
                    style={{ flexDirection: 'row', gap: 10 }}
                  >
                    {hasRank ? (
                      <RevealChip
                        text={totalScored <= 1 ? 'First one on the board' : `#${rank} of ${totalScored}`}
                      />
                    ) : null}
                    {hasXp ? <RevealChip text={`+${xpGain} XP`} /> : null}
                  </Animated.View>
                  {hasXp ? (
                    <LevelNudge xpAfter={xpAfter} xpGain={xpGain} leveledUp={leveledUp} instant={skipped} />
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* 2.4s — one milestone card */}
            {badge ? (
              <View style={{ height: 108, width: '100%', justifyContent: 'flex-end' }}>
                {milestoneVisible ? (
                  <Animated.View
                    entering={FadeInUp.springify().stiffness(200).damping(18)}
                    style={{
                      backgroundColor: c.card,
                      borderRadius: tokens.radius.xl,
                      borderWidth: 1,
                      borderColor: c.hairline,
                      paddingHorizontal: 18,
                      paddingVertical: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <Text style={{ fontSize: 30 }}>{badge.icon}</Text>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: c.fg, fontSize: 16, fontWeight: '800' }}>{badge.name}</Text>
                      {badge.description ? (
                        <Text style={{ color: c.mute, fontSize: 13, fontWeight: '400' }} numberOfLines={2}>
                          {badge.description}
                        </Text>
                      ) : null}
                    </View>
                  </Animated.View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* 3.2s — CTA row */}
          <View style={{ minHeight: 124, justifyContent: 'flex-end', paddingBottom: 12 }}>
            {phase >= 5 ? (
              <Animated.View entering={FadeIn.duration(250)} style={{ gap: 12 }}>
                {canMakeMemory ? (
                  isNight ? (
                    <>
                      <PillButton
                        title="Save for morning"
                        variant="primary"
                        size="lg"
                        springFeedback
                        haptic="light"
                        onPress={saveForMorning}
                      />
                      <PillButton
                        title="Add photos now"
                        variant="ghost"
                        size="lg"
                        springFeedback
                        onPress={makeMemory}
                      />
                    </>
                  ) : (
                    <>
                      <PillButton
                        title="Make it a memory"
                        variant="primary"
                        size="lg"
                        springFeedback
                        haptic="light"
                        onPress={makeMemory}
                      />
                      <PillButton title="Done for tonight" variant="ghost" size="lg" springFeedback onPress={done} />
                    </>
                  )
                ) : (
                  <PillButton title="Done" variant="primary" size="lg" springFeedback haptic="light" onPress={done} />
                )}
              </Animated.View>
            ) : null}
          </View>
        </View>

        <Confetti active={milestoneVisible} originY={0.45} />
      </Pressable>
    </SafeAreaView>
  );
}

// ─── The stamped score ──────────────────────────────────────────────
// Digits phase: SpringNumber (one decimal, mono 800, ~80pt) is the MaskedView
// mask, so the counting numeral itself wears tokens.gradients.brand — the one
// sanctioned gradient moment — for ~durations.milestoneFlash before fading to
// fg. At the stamp checkpoint the giant ScoreStamp border LANDS around the
// digits: scale 1.3→1, rotate −8°→−3° (springs.stamp) + medium haptic. The
// final resting body is the bordered stamp (ScoreStamp geometry at size 80).
const STAMP_SIZE = 80;

function StampedScore({ score, stamped, instant }: { score: number; stamped: boolean; instant: boolean }) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  const flash = useSharedValue(instant ? 0 : 1);
  useEffect(() => {
    if (instant) {
      flash.value = 0;
      return;
    }
    flash.value = withDelay(durations.milestoneFlash, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);
  const gradientStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  // Landing progress: < 0 is the bare digits phase (no border, no tilt).
  // On stamp it jumps to 0 (scale 1.3, −8°) and springs to 1 (scale 1, −3°).
  const land = useSharedValue(instant ? 1 : -1);
  useEffect(() => {
    if (instant) {
      land.value = 1;
      return;
    }
    if (!stamped) return;
    haptics.medium();
    land.value = 0;
    land.value = withSpring(1, springs.stamp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, stamped]);
  const landStyle = useAnimatedStyle(() => {
    if (land.value < 0) return { transform: [{ scale: 1 }, { rotate: '0deg' }] };
    return {
      transform: [
        { scale: interpolate(land.value, [0, 1], [1.3, 1]) },
        { rotate: `${interpolate(land.value, [0, 1], [-8, -3])}deg` },
      ],
    };
  });
  const borderStyle = useAnimatedStyle(() => ({ opacity: land.value < 0 ? 0 : 1 }));

  const numeralStyle: TextStyle = {
    fontFamily: tokens.fontFamilies.monoBold,
    fontVariant: ['tabular-nums'],
    fontSize: STAMP_SIZE,
    fontWeight: '800',
    letterSpacing: -2,
    color: c.fg,
  };
  const finalText = score.toFixed(1);

  return (
    <Animated.View style={[{ alignSelf: 'center' }, landStyle]}>
      {/* The stamp border — ScoreStamp geometry, hidden until the landing. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderWidth: 3,
            borderColor: c.fg,
            borderRadius: Math.max(8, STAMP_SIZE * 0.35),
          },
          borderStyle,
        ]}
      />
      <View
        style={{
          paddingHorizontal: Math.max(8, STAMP_SIZE * 0.5),
          paddingVertical: Math.max(2, STAMP_SIZE * 0.16),
        }}
      >
        <MaskedView
          maskElement={
            <SpringNumber
              // Re-key on skip: remounts with animateOnMount=false → final value instantly.
              key={instant ? 'final' : 'counting'}
              value={score}
              decimals={1}
              grouped={false}
              animateOnMount={!instant}
              style={numeralStyle}
            />
          }
        >
          {/* Layout ghost — sizes the masked content to the final numeral. */}
          <Text style={[numeralStyle, { opacity: 0 }]} allowFontScaling={false}>
            {finalText}
          </Text>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: c.fg }]} />
          <Animated.View style={[StyleSheet.absoluteFillObject, gradientStyle]}>
            <LinearGradient
              colors={tokens.gradients.brand as unknown as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </MaskedView>
      </View>
    </Animated.View>
  );
}

// ─── Bordered mono reveal chip — "#N OF M" / "+N XP" ────────────────
function RevealChip({ text }: { text: string }) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: c.fg,
        borderRadius: tokens.radius.chip,
        height: 28,
        paddingHorizontal: 12,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamilies.monoSemi,
          fontVariant: ['tabular-nums'],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: c.fg,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// ─── Thin level progress nudge ──────────────────────────────────────
function LevelNudge({
  xpAfter,
  xpGain,
  leveledUp,
  instant,
}: {
  xpAfter: number;
  xpGain: number;
  leveledUp: boolean;
  instant: boolean;
}) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const after = levelFor(xpAfter);
  const before = levelFor(Math.max(0, xpAfter - xpGain));
  const from = leveledUp ? 0 : before.progress;

  const progress = useSharedValue(instant ? after.progress : from);
  useEffect(() => {
    if (instant) {
      progress.value = after.progress;
      return;
    }
    progress.value = withDelay(
      200,
      withTiming(after.progress, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={{ width: '100%', gap: 7 }}>
      <View style={{ height: 4, borderRadius: 999, backgroundColor: c.card2, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 4, borderRadius: 999, backgroundColor: c.fg }, fillStyle]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: leveledUp ? c.fg : c.mute,
          }}
        >
          {leveledUp ? `Level up · ${after.name}` : after.name}
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontVariant: ['tabular-nums'],
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: c.mute,
          }}
        >
          {xpAfter.toLocaleString()} XP
        </Text>
      </View>
    </View>
  );
}
