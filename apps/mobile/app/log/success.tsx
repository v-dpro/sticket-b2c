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
import { colors, spacing } from '../../lib/theme';
import { previewLogRewards, type PastShow } from '../../lib/game';
import { getEventById, type Event } from '../../lib/local/repo/eventsRepo';

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
  const { eventId, newBadges } = useLocalSearchParams<{
    eventId: string;
    newBadges?: string;
  }>();

  const [event, setEvent] = useState<Event | null>(null);
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
    getEventById(String(eventId))
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
    city: (event as any)?.venue?.city ?? '',
  };

  // Compute gamification preview.  We pass an empty pastShows array here
  // because the actual history isn't available on this screen — the server
  // already persisted the log.  This gives baseline XP values and lets the
  // reveal feel correct even without full history context.
  const rewards = useMemo(() => {
    return previewLogRewards(
      { venue: show.venue, artist: show.artist, date: show.date },
      [] as PastShow[],
    );
  }, [show.artist, show.venue, show.date]);

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
                  fontSize: 36,
                  fontWeight: '900',
                  letterSpacing: 6,
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
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: colors.textHi,
                  marginBottom: 16,
                }}
              >
                +{rewards.xpGain}
              </Text>

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
                        fontWeight: '500',
                      }}
                    >
                      {r.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.brandCyan,
                        fontSize: 13,
                        fontWeight: '700',
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
                      fontWeight: '800',
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
                      fontWeight: '700',
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
                  title="Share to feed  \u2192"
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
                      router.replace('/(tabs)/discover');
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
