// LOG FLOW · STEP 3 — THE COMPARE. Binary-search placement against your own
// history: "Which night wins?" Tap a card to pick the winner; ties resolve
// immediately. When the server runs out of opponents, the score finalizes
// and we hand off to the reveal. First-ever log takes the vibe-pick variant.
// Route contract:
//   in:  { logId, first ('1'|'0'), eventId, eventName, venueName, eventDate,
//          xpGain?, xpAfter?, leveledUp?, badges? }
//   out: replace /log/success { eventId, eventName, score, rank,
//          totalScored, xpGain?, xpAfter?, leveledUp?, badges? }

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CompareCard } from '../../components/log/CompareCard';
import { FlowHeader } from '../../components/log/FlowHeader';
import { RoundDots } from '../../components/log/RoundDots';
import { VibeCard } from '../../components/log/VibeCard';
import { PillButton } from '../../components/ui/PillButton';
import { getErrorMessage } from '../../lib/api/errorUtils';
import {
  compareLog,
  getNextOpponent,
  scoreLog,
  type CompareOpponent,
  type CompareOutcome,
  type LogVibe,
} from '../../lib/api/logs';
import { haptics, springs } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';

type Phase = 'loading' | 'ready' | 'submitting' | 'finalizing' | 'error';

// A7 choice-feedback beat: the opponent's real score flashes in on the folding
// card before the next opponent slides in. Hold the score at full opacity
// briefly, then fold; keep the whole reveal on screen for ~FLASH_TOTAL ms
// regardless of network latency.
const FLASH_HOLD = 180; // score legible at full opacity before the fold
const FOLD_MS = 220; // card collapse duration
const FLASH_TOTAL = FLASH_HOLD + FOLD_MS; // ~400ms perceived reveal

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Opponent eyebrow: "JUN 2024" — the month/year it was placed under.
function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
}

function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CompareScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;

  const params = useLocalSearchParams<{
    logId: string;
    first?: string;
    eventId?: string;
    eventName?: string;
    venueId?: string;
    venueName?: string;
    section?: string;
    row?: string;
    seat?: string;
    eventDate?: string;
    xpGain?: string;
    xpAfter?: string;
    leveledUp?: string;
    badges?: string;
  }>();
  const logId = params.logId ? String(params.logId) : '';
  const isFirstLog = params.first === '1';
  const tonightName = params.eventName ? String(params.eventName) : 'Tonight’s show';
  const tonightVenue = params.venueName ? String(params.venueName) : undefined;

  const [phase, setPhase] = useState<Phase>(isFirstLog ? 'ready' : 'loading');
  const [opponent, setOpponent] = useState<CompareOpponent | null>(null);
  const [round, setRound] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // A7: opponent score stays hidden until the user commits; it flashes in on
  // the folding card during the choice-feedback beat.
  const [revealScore, setRevealScore] = useState(false);
  // A7: one "Too close to call" per log — the button disables after the first.
  const [tieUsed, setTieUsed] = useState(false);
  const retryRef = useRef<() => void>(() => {});

  // Card collapse choreography — cards fold inward on choice; the next
  // opponent slides in (SlideInRight on the re-keyed card).
  const leftOut = useSharedValue(0);
  const rightOut = useSharedValue(0);
  const leftStyle = useAnimatedStyle(() => ({
    opacity: 1 - leftOut.value,
    transform: [
      { translateX: leftOut.value * 28 },
      { scale: 1 - leftOut.value * 0.08 },
    ],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: 1 - rightOut.value,
    transform: [
      { translateX: rightOut.value * -28 },
      { scale: 1 - rightOut.value * 0.08 },
    ],
  }));

  const fail = useCallback((e: unknown, retry: () => void) => {
    retryRef.current = retry;
    setErrorMsg(getErrorMessage(e));
    setPhase('error');
  }, []);

  const goToSuccess = useCallback(
    (result?: { score: number; rank: number; totalScored: number }) => {
      router.replace({
        pathname: '/log/success',
        params: {
          // logId threads into the "Make it a memory" step from the reveal.
          logId,
          ...(params.eventId ? { eventId: String(params.eventId) } : {}),
          eventName: tonightName,
          // Pass-through so the memory step can prefill without a refetch
          // (all optional — it self-resolves from the event otherwise).
          ...(params.venueId ? { venueId: String(params.venueId) } : {}),
          ...(tonightVenue ? { venueName: tonightVenue } : {}),
          ...(params.section ? { section: String(params.section) } : {}),
          ...(params.row ? { row: String(params.row) } : {}),
          ...(params.seat ? { seat: String(params.seat) } : {}),
          ...(result
            ? {
                score: String(result.score),
                rank: String(result.rank),
                totalScored: String(result.totalScored),
              }
            : {}),
          ...(params.xpGain ? { xpGain: String(params.xpGain) } : {}),
          ...(params.xpAfter ? { xpAfter: String(params.xpAfter) } : {}),
          ...(params.leveledUp ? { leveledUp: String(params.leveledUp) } : {}),
          ...(params.badges ? { badges: String(params.badges) } : {}),
        },
      });
    },
    [
      router,
      logId,
      params.eventId,
      params.venueId,
      params.section,
      params.row,
      params.seat,
      params.xpGain,
      params.xpAfter,
      params.leveledUp,
      params.badges,
      tonightName,
      tonightVenue,
    ],
  );

  const finalize = useCallback(
    async (vibe?: LogVibe) => {
      setPhase('finalizing');
      setErrorMsg(null);
      try {
        const res = await scoreLog(logId, vibe);
        goToSuccess({ score: res.score, rank: res.rank, totalScored: res.totalScored });
      } catch (e: any) {
        if (e?.response?.status === 409) {
          // Already scored (double submit) — the reveal degrades gracefully
          // without score params rather than dead-ending here.
          goToSuccess();
          return;
        }
        fail(e, () => void finalize(vibe));
      }
    },
    [logId, goToSuccess, fail],
  );

  const fetchOpponent = useCallback(async () => {
    setPhase('loading');
    setErrorMsg(null);
    try {
      const { opponent: next } = await getNextOpponent(logId);
      if (!next) {
        await finalize();
        return;
      }
      setRevealScore(false);
      leftOut.value = 0;
      rightOut.value = 0;
      setOpponent(next);
      setPhase('ready');
    } catch (e) {
      fail(e, () => void fetchOpponent());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId, finalize, fail]);

  useEffect(() => {
    if (!isFirstLog) void fetchOpponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitChoice = useCallback(
    async (opp: CompareOpponent, result: CompareOutcome) => {
      setPhase('submitting');
      // A7: reveal the opponent's real score as the card folds. Hold it at
      // full opacity for a beat, then collapse both cards inward.
      setRevealScore(true);
      const startedAt = Date.now();
      leftOut.value = withDelay(FLASH_HOLD, withTiming(1, { duration: FOLD_MS }));
      rightOut.value = withDelay(FLASH_HOLD, withTiming(1, { duration: FOLD_MS }));

      let res: Awaited<ReturnType<typeof compareLog>>;
      try {
        res = await compareLog(logId, opp.id, result);
      } catch (e: any) {
        if (e?.response?.status === 409) {
          // Log already scored — skip straight to the reveal.
          goToSuccess();
          return;
        }
        setRevealScore(false);
        leftOut.value = withSpring(0, springs.gentle);
        rightOut.value = withSpring(0, springs.gentle);
        fail(e, () => void submitChoice(opp, result));
        return;
      }

      // Keep the score reveal on screen for the full flash beat even when the
      // round posts faster than the animation.
      const elapsed = Date.now() - startedAt;
      if (elapsed < FLASH_TOTAL) await wait(FLASH_TOTAL - elapsed);

      if (res.resolved) {
        await finalize();
        return;
      }
      setRound(res.round + 1);

      // The comparison is recorded — a failure past this point retries the
      // opponent fetch only (never re-posts the same round).
      try {
        const { opponent: next } = await getNextOpponent(logId);
        if (!next) {
          await finalize();
          return;
        }
        // New opponent hides its score again; tonight's card springs back and
        // the re-keyed opponent slides in.
        setRevealScore(false);
        leftOut.value = withSpring(0, springs.gentle);
        rightOut.value = 0;
        setOpponent(next);
        setPhase('ready');
      } catch (e) {
        fail(e, () => void fetchOpponent());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logId, finalize, fail, goToSuccess, fetchOpponent],
  );

  const choose = useCallback(
    (result: CompareOutcome) => {
      if (phase !== 'ready' || !opponent) return;
      if (result === 'tie') {
        if (tieUsed) return; // one tie per log
        setTieUsed(true);
      }
      void submitChoice(opponent, result);
    },
    [phase, opponent, submitChoice, tieUsed],
  );

  const pickVibe = useCallback(
    (vibe: LogVibe) => {
      if (phase !== 'ready') return;
      void finalize(vibe);
    },
    [phase, finalize],
  );

  const exitToTimeline = () => {
    haptics.light();
    router.replace('/(tabs)/you');
  };

  // ── Shared chrome ──
  const renderBody = () => {
    if (phase === 'error') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 6 }}>
          <Text style={{ color: c.fg, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
            That didn’t go through
          </Text>
          <Text style={{ color: c.mute, fontSize: 14, fontWeight: '400', textAlign: 'center' }}>
            {errorMsg ?? 'Something hiccuped. Your log is saved — scoring just needs another try.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <PillButton
              title="Try again"
              variant="primary"
              size="md"
              springFeedback
              haptic="light"
              onPress={() => retryRef.current()}
            />
            <PillButton title="Finish later" variant="ghost" size="md" springFeedback onPress={exitToTimeline} />
          </View>
        </View>
      );
    }

    if (phase === 'finalizing' || (phase === 'loading' && !opponent)) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="small" color={c.mute} />
          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: c.mute,
            }}
          >
            {phase === 'finalizing' ? 'Placing it…' : 'Lining them up…'}
          </Text>
        </View>
      );
    }

    if (isFirstLog) {
      return (
        <View style={{ flex: 1, paddingHorizontal: pad }}>
          <View style={{ paddingTop: 8, paddingBottom: 24, gap: 6 }}>
            <Text style={{ color: c.fg, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
              How was it?
            </Text>
            <Text style={{ color: c.mute, fontSize: 15, fontWeight: '400' }}>
              Your first one on the board — gut call.
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            <VibeCard emoji="🤯" label="Unreal" description="One for the hall of fame" onPress={() => pickVibe('great')} />
            <VibeCard emoji="🙂" label="Good night" description="Glad I went" onPress={() => pickVibe('fine')} />
            <VibeCard emoji="😕" label="Rough" description="Not their night — or mine" onPress={() => pickVibe('bad')} />
          </View>
        </View>
      );
    }

    if (!opponent) return null;
    const busy = phase !== 'ready';

    return (
      <View style={{ flex: 1, paddingHorizontal: pad }}>
        <View style={{ paddingTop: 8, paddingBottom: 18, gap: 6 }}>
          <Text style={{ color: c.fg, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            Which night wins?
          </Text>
          <Text style={{ color: c.mute, fontSize: 15, fontWeight: '400' }}>
            Tap the better show. This places tonight in your ranks.
          </Text>
        </View>

        <RoundDots round={round} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <Animated.View style={[{ flex: 1 }, leftStyle]}>
            <CompareCard
              tag="Tonight"
              tonight
              title={tonightName}
              subtitle={tonightVenue}
              disabled={busy}
              onPress={() => choose('win')}
            />
          </Animated.View>

          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 1,
              color: c.muteSoft,
            }}
          >
            VS
          </Text>

          <Animated.View style={[{ flex: 1 }, rightStyle]} key={opponent.id} entering={SlideInRight.springify().stiffness(180).damping(22)}>
            <CompareCard
              tag={monthYear(opponent.event.date) || 'Ranked'}
              title={opponent.event.name}
              subtitle={prettyDate(opponent.event.date)}
              score={opponent.score}
              revealScore={revealScore}
              photo={opponent.photo}
              disabled={busy}
              onPress={() => choose('loss')}
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(250)} style={{ marginTop: 24, alignItems: 'center', gap: 8 }}>
          <PillButton
            title="Too close — skip this one"
            variant="ghost"
            size="md"
            springFeedback
            haptic="light"
            disabled={busy || tieUsed}
            onPress={() => choose('tie')}
          />
          {tieUsed ? (
            <Text
              style={{
                fontFamily: tokens.fontFamilies.mono,
                fontSize: 11,
                fontWeight: '400',
                letterSpacing: 0.3,
                color: c.muteSoft,
                textAlign: 'center',
              }}
            >
              One tie per ranking — pick a side from here.
            </Text>
          ) : null}
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <FlowHeader
        icon="close"
        label={isFirstLog ? 'First score' : `Compare · ${round} of ${Math.max(5, round)}`}
        onPress={exitToTimeline}
      />
      {renderBody()}
    </SafeAreaView>
  );
}
