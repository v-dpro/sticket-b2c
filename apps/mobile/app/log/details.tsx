// LOG FLOW · STEP 2 — details, minimal. Poster-style event header + optional
// seat tiles + optional one-line note + "Log it". ~5 seconds of a 30-second loop.
// Route contract:
//   in:  { eventId } (+ optional display params from select-event:
//          eventName, eventDate, artistImage, venueName, venueCity )
//   out: POST /logs → replace /log/compare { logId, eventId, eventName,
//          venueName, eventDate, first, xpGain, xpAfter, leveledUp, badges }
//        (existing log → edit mode → PATCH → replace /log/[id])

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowHeader } from '../../components/log/FlowHeader';
import { LogField } from '../../components/log/LogField';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { getEvent } from '../../lib/api/events';
import { createLog, updateLog } from '../../lib/api/logs';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import type { EventDetails } from '../../types/event';

// Mono date for the poster header: "TONIGHT" when the show is today,
// otherwise "JUL 12 2026".
function monoDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return 'TONIGHT';
  }
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .replace(',', '')
    .toUpperCase();
}

export default function LogDetails() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;
  const { refresh } = useSession();

  const params = useLocalSearchParams<{
    eventId: string;
    eventName?: string;
    eventDate?: string;
    artistImage?: string;
    venueName?: string;
    venueCity?: string;
    // Seat prefill from a wallet ticket (A6 Tonight card).
    section?: string;
    row?: string;
    seat?: string;
  }>();
  const eventId = params.eventId ? String(params.eventId) : '';

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [section, setSection] = useState(params.section ? String(params.section) : '');
  const [row, setRow] = useState(params.row ? String(params.row) : '');
  const [seat, setSeat] = useState(params.seat ? String(params.seat) : '');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      // /events/:id also carries the signed-in user's log for prefill.
      const data = await getEvent(eventId);
      setEvent(data);
      const log = data.userLog;
      if (log) {
        setExistingLogId(log.id);
        setSection(log.section ?? '');
        setRow(log.row ?? '');
        setSeat(log.seat ?? '');
        setNote(log.note ?? '');
      } else {
        setExistingLogId(null);
      }
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  // Display values — params paint instantly, the fetch fills the gaps.
  const eventName = event?.name || (params.eventName ? String(params.eventName) : 'Your show');
  const eventDate = event?.date || (params.eventDate ? String(params.eventDate) : undefined);
  const venueLine = [
    event?.venue?.name || (params.venueName ? String(params.venueName) : ''),
    event?.venue?.city || (params.venueCity ? String(params.venueCity) : ''),
  ]
    .filter(Boolean)
    .join(' · ');

  const onSubmit = async () => {
    if (!eventId || isSaving) return;
    setIsSaving(true);
    try {
      if (existingLogId) {
        await updateLog(existingLogId, {
          note: note.trim() || null,
          section: section.trim() || null,
          row: row.trim() || null,
          seat: seat.trim() || null,
        });
        await refresh();
        router.replace({ pathname: '/log/[id]', params: { id: existingLogId } });
        return;
      }

      const res = await createLog({
        eventId,
        note: note.trim() || undefined,
        section: section.trim() || undefined,
        row: row.trim() || undefined,
        seat: seat.trim() || undefined,
        visibility: 'PUBLIC',
      });
      await refresh();

      // Thread the server-computed rewards through the compare loop to the
      // reveal — success.tsx reads these exact params.
      const badges = (res.newBadges ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description,
      }));

      router.replace({
        pathname: '/log/compare',
        params: {
          logId: res.id,
          eventId,
          eventName,
          venueName: event?.venue?.name || (params.venueName ? String(params.venueName) : ''),
          eventDate: eventDate ?? '',
          first: res.hasScoredHistory ? '0' : '1',
          ...(typeof res.xpGain === 'number' ? { xpGain: String(res.xpGain) } : {}),
          ...(typeof res.xpAfter === 'number' ? { xpAfter: String(res.xpAfter) } : {}),
          ...(res.leveledUp ? { leveledUp: '1' } : {}),
          ...(badges.length ? { badges: JSON.stringify(badges) } : {}),
        },
      });
    } catch (apiErr: any) {
      if (apiErr?.response?.status === 409) {
        // Already logged — reload so the screen flips into edit mode.
        setIsSaving(false);
        await loadEvent();
        return;
      }
      Alert.alert('Could not save log', getErrorMessage(apiErr));
      setIsSaving(false);
    }
  };

  if (loadError && !event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <FlowHeader icon="back" label="Logging" onPress={goBack} />
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: pad }}>
          <ErrorState title="Couldn't load show" message={loadError} onRetry={loadEvent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlowHeader icon="back" label="Logging" onPress={goBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 48, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Event block — poster-style header, no card chrome */}
          <View style={{ marginTop: 8, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text
                style={{ flex: 1, color: c.fg, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}
                numberOfLines={2}
              >
                {eventName}
              </Text>
              {isLoading ? <ActivityIndicator size="small" color={c.mute} /> : null}
            </View>
            {venueLine || eventDate ? (
              <Text
                style={{
                  fontFamily: tokens.fontFamilies.mono,
                  fontVariant: ['tabular-nums'],
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: c.mute,
                }}
                numberOfLines={1}
              >
                {[venueLine, monoDate(eventDate)].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

          {/* Seat — optional, compact inline */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontFamily: tokens.fontFamilies.mono,
                fontSize: 10.5,
                fontWeight: '600',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: c.mute,
              }}
            >
              Your seat · optional
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SeatTile label="Sec" value={section} onChangeText={setSection} />
              <SeatTile label="Row" value={row} onChangeText={setRow} />
              <SeatTile label="Seat" value={seat} onChangeText={setSeat} />
            </View>
          </View>

          {/* Note — one line */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontFamily: tokens.fontFamilies.mono,
                fontSize: 10.5,
                fontWeight: '600',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: c.mute,
              }}
            >
              One line · optional
            </Text>
            <LogField
              placeholder="One line you’ll want to remember"
              value={note}
              onChangeText={setNote}
              maxLength={140}
              returnKeyType="done"
            />
          </View>

          <View style={{ marginTop: 8 }}>
            <PillButton
              title={isSaving ? 'Saving…' : existingLogId ? 'Save changes' : 'Log it'}
              variant="primary"
              size="lg"
              springFeedback
              haptic="medium"
              disabled={isSaving || isLoading}
              onPress={onSubmit}
            />
            {existingLogId ? (
              <Text style={{ color: c.mute, fontSize: 12.5, fontWeight: '400', textAlign: 'center', marginTop: 12 }}>
                You’ve already logged this one — edits only.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// SeatTile — one third of the SEC / ROW / SEAT strip: centered mono label
// over a centered mono value, on a card surface (ticket-stub data tile).
function SeatTile({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.card,
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: c.hairline,
        paddingVertical: 12,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: c.muteSoft,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="—"
        placeholderTextColor={c.muteSoft}
        selectionColor={c.accent}
        textAlign="center"
        style={{
          alignSelf: 'stretch',
          paddingVertical: 0,
          paddingHorizontal: 6,
          fontFamily: tokens.fontFamilies.mono,
          fontVariant: ['tabular-nums'],
          fontSize: 20,
          fontWeight: '700',
          color: c.fg,
        }}
      />
    </View>
  );
}
