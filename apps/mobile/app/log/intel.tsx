// LOG FLOW · STEP 5 (optional) — THE INTEL DROP. After the reveal, ten
// seconds for the next crowd: a quick seat verdict (only when the log had a
// section) and one venue tip with a category chip. Every answer becomes
// planning fuel — seat ratings feed the venue's section map, tips lead the
// GET IN card on THE NIGHT. Both questions are skippable in one tap; nothing
// here blocks the loop.
// Route contract in: { eventId, eventName?, venueId?, venueName?, section?, row? }
// (venueId missing → fetched from GET /events/:id). Out: replace /(tabs)/you.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { FlowHeader } from '../../components/log/FlowHeader';
import { LogField } from '../../components/log/LogField';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { getEvent } from '../../lib/api/events';
import { submitSeatRating, submitVenueTip } from '../../lib/api/venues';
import { durations, haptics } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';

const VERDICTS = [
  { value: 1, label: 'BAD' },
  { value: 2, label: 'MEH' },
  { value: 3, label: 'OK' },
  { value: 4, label: 'GOOD' },
  { value: 5, label: 'GREAT' },
] as const;

const TIP_CATEGORIES = ['entry', 'parking', 'seating', 'food', 'general'] as const;
type TipCategory = (typeof TIP_CATEGORIES)[number];

export default function LogIntel() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    eventId?: string;
    eventName?: string;
    venueId?: string;
    venueName?: string;
    section?: string;
    row?: string;
  }>();
  const eventId = params.eventId ? String(params.eventId) : '';
  const section = params.section ? String(params.section) : '';

  const [venueId, setVenueId] = useState(params.venueId ? String(params.venueId) : '');
  const [venueName, setVenueName] = useState(params.venueName ? String(params.venueName) : '');
  const [verdict, setVerdict] = useState<number | null>(null);
  const [tipCategory, setTipCategory] = useState<TipCategory>('entry');
  const [tipText, setTipText] = useState('');
  const [sending, setSending] = useState(false);

  // venueId fallback — older callers only carry eventId.
  useEffect(() => {
    if (venueId || !eventId) return;
    let alive = true;
    getEvent(eventId)
      .then((e) => {
        if (!alive) return;
        setVenueId(e.venue.id);
        if (!venueName) setVenueName(e.venue.name);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot fallback fetch
  }, [eventId, venueId]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    scrollContent: { paddingHorizontal: t.density.pad, paddingBottom: 48, gap: 26 },
    lede: { marginTop: 8, gap: 8 },
    ledeTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    ledeSub: { fontSize: 14, lineHeight: 20, color: t.colors.mute },
    qLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    chipActive: { backgroundColor: t.colors.inverseBg, borderColor: t.colors.inverseBg },
    chipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    chipTextActive: { color: t.colors.inverseFg },
    footNote: { fontSize: 12.5, color: t.colors.muteSoft, textAlign: 'center', marginTop: 12 },
  }));

  const hasSomething = (verdict !== null && Boolean(section)) || tipText.trim().length > 0;

  const finish = () => router.replace('/(tabs)/you');

  const send = async () => {
    if (sending) return;
    if (!hasSomething || !venueId) {
      finish();
      return;
    }
    setSending(true);
    // Fire both best-effort — intel never blocks the exit.
    const jobs: Promise<unknown>[] = [];
    if (verdict !== null && section) {
      jobs.push(
        submitSeatRating(venueId, {
          section,
          row: params.row ? String(params.row) : undefined,
          rating: verdict,
          eventId: eventId || undefined,
        }),
      );
    }
    if (tipText.trim()) {
      jobs.push(submitVenueTip(venueId, { text: tipText.trim(), category: tipCategory }));
    }
    await Promise.allSettled(jobs);
    haptics.success();
    finish();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlowHeader icon="close" label="For the next crowd" onPress={finish} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(durations.fadeThrough)} style={styles.lede}>
            <Text style={styles.ledeTitle}>Ten seconds for the next crowd</Text>
            <Text style={styles.ledeSub}>
              {venueName
                ? `You just did ${venueName}. What you know now is exactly what the next planner needs.`
                : 'What you know now is exactly what the next planner needs.'}
            </Text>
          </Animated.View>

          {section ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.qLabel}>Worth it from sec {section}?</Text>
              <View style={styles.chipRow}>
                {VERDICTS.map((v) => {
                  const active = verdict === v.value;
                  return (
                    <SpringPressable
                      key={v.value}
                      haptic="light"
                      onPress={() => setVerdict(active ? null : v.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Seat verdict: ${v.label}`}
                      style={[styles.chip, active ? styles.chipActive : null]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                        {v.value} · {v.label}
                      </Text>
                    </SpringPressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            <Text style={styles.qLabel}>One tip · optional</Text>
            <View style={styles.chipRow}>
              {TIP_CATEGORIES.map((cat) => {
                const active = tipCategory === cat;
                return (
                  <SpringPressable
                    key={cat}
                    haptic="none"
                    onPress={() => setTipCategory(cat)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Tip category ${cat}`}
                    style={[styles.chip, active ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                      {cat.toUpperCase()}
                    </Text>
                  </SpringPressable>
                );
              })}
            </View>
            <LogField
              placeholder="Doors, lines, parking, sound — what should they know?"
              value={tipText}
              onChangeText={setTipText}
              maxLength={200}
              returnKeyType="done"
            />
          </View>

          <View style={{ gap: 12, marginTop: 4 }}>
            <PillButton
              title={sending ? 'Sending…' : hasSomething ? 'Send it' : 'Nothing to add'}
              variant="primary"
              size="lg"
              springFeedback
              haptic="medium"
              disabled={sending || !hasSomething}
              onPress={() => void send()}
            />
            <PillButton title="Skip" variant="ghost" size="lg" springFeedback onPress={finish} />
            <Text style={styles.footNote}>
              Tips and seat verdicts show up where people plan their night.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
