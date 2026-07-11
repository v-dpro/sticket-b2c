import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { XpBar } from '../../components/ui/XpBar';
import { TicketStub } from '../../components/ui/TicketStub';
import { PillButton } from '../../components/ui/PillButton';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { SpringNumber } from '../../components/ui/SpringNumber';
import { colors, spacing, fontFamilies } from '../../lib/theme';
import { Confetti } from '../../components/ui/Confetti';
import { levelFor, previewLogRewards, type PastShow } from '../../lib/game';
import { getEvent } from '../../lib/api/events';
import type { EventDetails } from '../../types/event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateISO: string) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStubDate(dateISO: string) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Phase timings (ms after mount)
// ---------------------------------------------------------------------------

const PHASE_TIMINGS = [0, 1500, 2500, 3500, 4500] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LogSuccess() {
  const router = useRouter();
  const { eventId, newBadges, xpGain, xpAfter, leveledUp, badges } = useLocalSearchParams<{
    eventId: string;
    newBadges?: string;
    xpGain?: string;
    xpAfter?: string;
    leveledUp?: string;
    badges?: string;
  }>();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [phase, setPhase] = useState(0);

  // Animated values — one per phase for opacity, plus stamp scale
  const stampScale = useRef(new Animated.Value(0)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const badgesOpacity = useRef(new Animated.Value(0)).current;
  const stubOpacity = useRef(new Animated.Value(0)).current;

  // ------------------------------------------------------------------
  // Load event
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!eventId) return;
    getEvent(String(eventId))
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [eventId]);

  // ------------------------------------------------------------------
  // Phase advancement
  // ------------------------------------------------------------------

  useEffect(() => {
    const timers = PHASE_TIMINGS.slice(1).map((ms, i) =>
      setTimeout(() => setPhase(i + 1), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // ------------------------------------------------------------------
  // Animations triggered by phase changes
  // ------------------------------------------------------------------

  useEffect(() => {
    if (phase >= 1) {
      // Stamp appear
      Animated.parallel([
        Animated.spring(stampScale, {
          toValue: 1,
          damping: 10,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(stampOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [phase >= 1]);

  useEffect(() => {
    if (phase >= 2) {
      Animated.timing(xpOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [phase >= 2]);

  useEffect(() => {
    if (phase >= 3) {
      Animated.timing(badgesOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [phase >= 3]);

  useEffect(() => {
    if (phase >= 4) {
      Animated.timing(stubOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [phase >= 4]);

  // ------------------------------------------------------------------
  // Derived show data
  // ------------------------------------------------------------------

  const show = {
    artist: event?.artist.name ?? 'Artist',
    venue: event?.venue.name ?? 'Venue',
    date: event?.date ?? new Date().toISOString().slice(0, 10),
    city: event?.venue?.city ?? '',
  };

  // Server-computed rewards passed from the log action (POST /logs returns
  // { xpGain, xpAfter, leveledUp, newBadges }).
  const serverXpGain = Number(xpGain);
  const serverXpAfter = Number(xpAfter);
  const hasServerRewards = Number.isFinite(serverXpGain) && Number.isFinite(serverXpAfter);

  const serverBadges = useMemo(() => {
    if (!badges) return null;
    try {
      const parsed = JSON.parse(String(badges));
      if (!Array.isArray(parsed)) return null;
      return parsed
        .filter((b) => b && typeof b.id === 'string')
        .map((b) => ({
          id: b.id as string,
          label: typeof b.name === 'string' && b.name ? b.name : String(b.id),
          emoji: typeof b.icon === 'string' && b.icon ? b.icon : '🏅',
          desc: typeof b.description === 'string' ? b.description : '',
        }));
    } catch {
      return null;
    }
  }, [badges]);

  // Client-side preview — only used as a defensive fallback when the server
  // fields are absent (e.g. log edits or older callers).
  const preview = useMemo(() => {
    return previewLogRewards(
      { venue: show.venue, artist: show.artist, date: show.date },
      [] as PastShow[],
    );
  }, [show.artist, show.venue, show.date]);

  const rewards = useMemo(() => {
    if (!hasServerRewards) return preview;
    return {
      ...preview,
      xpGain: serverXpGain,
      xpAfter: serverXpAfter,
      leveledUp: leveledUp === '1' || leveledUp === 'true',
      afterLevel: levelFor(serverXpAfter),
      reasons: [{ label: 'Show logged', value: `+${serverXpGain}` }],
      newBadges: serverBadges ?? [],
    };
  }, [hasServerRewards, preview, serverXpGain, serverXpAfter, leveledUp, serverBadges]);

  // Parse new badge IDs passed from the log action
  const parsedBadgeIds = useMemo(() => {
    return String(newBadges || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [newBadges]);

  // Merge with computed badges — prefer computed ones but include server-side IDs
  const displayBadges = useMemo(() => {
    const computed = rewards.newBadges;
    // If server passed badge IDs that aren't in computed, add placeholders
    const computedIds = new Set(computed.map((b) => b.id));
    const extras = parsedBadgeIds
      .filter((id) => !computedIds.has(id))
      .map((id) => ({ id, label: id, emoji: '🏅', desc: '' }));
    return [...computed, ...extras];
  }, [rewards.newBadges, parsedBadgeIds]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingBottom: 48,
          alignItems: 'center',
          justifyContent: phase === 0 ? 'center' : 'flex-start',
          paddingTop: phase === 0 ? 0 : 64,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------- */}
        {/* Phase 0: Saving spinner                                    */}
        {/* ---------------------------------------------------------- */}
        {phase === 0 && (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator
              size="large"
              color={colors.brandCyan}
              style={{ marginBottom: 20 }}
            />
            <MonoLabel size={11} color={colors.brandCyan}>
              STAMPING YOUR STUB...
            </MonoLabel>
          </View>
        )}

        {/* Confetti burst */}
        <Confetti active={phase >= 1} originY={0.35} />

        {/* ---------------------------------------------------------- */}
        {/* Phase 1: LOGGED stamp                                      */}
        {/* ---------------------------------------------------------- */}
        {phase >= 1 && (
          <Animated.View
            style={{
              opacity: stampOpacity,
              transform: [{ scale: stampScale }],
              marginBottom: 32,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                borderWidth: 3,
                borderColor: colors.brandCyan,
                borderRadius: 8,
                paddingHorizontal: 28,
                paddingVertical: 12,
                transform: [{ rotate: '-8deg' }],
              }}
            >
              <Text
                style={{
                  color: colors.textHi,
                  fontSize: 28,
                  fontFamily: fontFamilies.monoBold,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                }}
              >
                LOGGED
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ---------------------------------------------------------- */}
        {/* Phase 2: XP card                                           */}
        {/* ---------------------------------------------------------- */}
        {phase >= 2 && (
          <Animated.View
            style={{
              opacity: xpOpacity,
              width: '100%',
              marginBottom: 24,
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.hairline,
                padding: 20,
              }}
            >
              {/* Header */}
              <MonoLabel size={10} color={colors.brandCyan} style={{ marginBottom: 6 }}>
                XP EARNED
              </MonoLabel>
              <View style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
                <SpringNumber
                  value={rewards.xpGain}
                  prefix="+"
                  mode="spring"
                  style={{
                    fontSize: 72,
                    fontFamily: fontFamilies.displayItalic,
                    color: colors.textHi,
                  }}
                />
              </View>

              {/* Reasons breakdown */}
              <View style={{ gap: 8, marginBottom: 20 }}>
                {rewards.reasons.map((r) => (
                  <View
                    key={r.label}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textMid,
                        fontSize: 13,
                        fontFamily: fontFamilies.mono,
                      }}
                    >
                      {r.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.brandCyan,
                        fontSize: 13,
                        fontFamily: fontFamilies.monoBold,
                      }}
                    >
                      {r.value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Level progress */}
              <XpBar xp={rewards.xpAfter} showLabel />

              {/* Level-up callout */}
              {rewards.leveledUp && (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: colors.elevated,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: colors.brandCyan,
                      fontSize: 14,
                      fontFamily: fontFamilies.monoSemi,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    Level Up! {rewards.afterLevel.name}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ---------------------------------------------------------- */}
        {/* Phase 3: Badges                                            */}
        {/* ---------------------------------------------------------- */}
        {phase >= 3 && displayBadges.length > 0 && (
          <Animated.View
            style={{
              opacity: badgesOpacity,
              width: '100%',
              marginBottom: 24,
              gap: 10,
            }}
          >
            <MonoLabel size={10} color={colors.brandCyan} style={{ marginBottom: 4 }}>
              NEW BADGES
            </MonoLabel>
            {displayBadges.map((badge) => (
              <View
                key={badge.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 28 }}>{badge.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textHi,
                      fontSize: 15,
                      fontFamily: fontFamilies.uiBold,
                      marginBottom: 2,
                    }}
                  >
                    {badge.label}
                  </Text>
                  {badge.desc ? (
                    <Text
                      style={{
                        color: colors.textMid,
                        fontSize: 12,
                        fontFamily: fontFamilies.ui,
                      }}
                    >
                      {badge.desc}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ---------------------------------------------------------- */}
        {/* Phase 4: Collectible stub + actions                        */}
        {/* ---------------------------------------------------------- */}
        {phase >= 4 && (
          <Animated.View
            style={{
              opacity: stubOpacity,
              width: '100%',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <TicketStub
              artist={show.artist}
              venue={show.venue}
              city={show.city}
              date={formatStubDate(show.date)}
            />

            <View
              style={{
                width: '100%',
                gap: 12,
                marginTop: 8,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <PillButton
                  title={'Share to feed  \u2192'}
                  variant="solid"
                  size="lg"
                  accentColor={colors.pink}
                  onPress={() => {
                    if (eventId) {
                      router.replace({
                        pathname: '/log/details',
                        params: { eventId: String(eventId) },
                      });
                    }
                  }}
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <PillButton
                  title="Done"
                  variant="ghost"
                  size="lg"
                  onPress={() => {
                    if (eventId) {
                      router.replace({
                        pathname: '/event/[eventId]',
                        params: { eventId: String(eventId) },
                      });
                    } else {
                      router.replace('/(tabs)/explore');
                    }
                  }}
                />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}
