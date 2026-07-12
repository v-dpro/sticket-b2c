import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { addTicket, updateTicket } from '../../lib/api/tickets';
import { getEvent, promoteInterestedToGoing } from '../../lib/api/events';
import { getErrorMessage } from '../../lib/api/errorUtils';
import type { TicketStatus } from '../../types/ticket';
import { useSession } from '../../hooks/useSession';

const statuses: TicketStatus[] = ['KEEPING', 'SELLING', 'SOLD'];

function Field({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    label: { color: t.colors.mute, fontSize: 13, marginBottom: 6, fontWeight: '500' },
    input: {
      height: 48,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: 14,
      color: t.colors.fg,
      fontSize: 16,
    },
  }));
  return (
    <View style={{ gap: 0, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.muteSoft}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export default function TicketDetails() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useSession();

  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [seat, setSeat] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<TicketStatus>('KEEPING');
  const [isSaving, setIsSaving] = useState(false);

  const [eventName, setEventName] = useState<string>('');

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: 24 },
    title: { color: t.colors.fg, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: t.colors.mute },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 999,
      alignItems: 'center',
      backgroundColor: t.colors.card2,
    },
    segmentActive: { backgroundColor: t.colors.inverseBg },
    segmentText: { color: t.colors.text, fontWeight: '600' },
    segmentTextActive: { color: t.colors.inverseFg },
  }));

  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;
    getEvent(String(eventId))
      .then((event) => {
        if (cancelled) return;
        setEventName(event.name ?? '');
      })
      .catch(() => {
        // Name is decorative here — the save flow surfaces real errors.
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const onSave = async () => {
    if (!user || !eventId) return;
    setIsSaving(true);
    try {
      const ticket = await addTicket({
        eventId: String(eventId),
        section: section.trim() || undefined,
        row: row.trim() || undefined,
        seat: seat.trim() || undefined,
        barcode: barcode.trim() || undefined,
      });

      // POST /tickets always creates KEEPING; apply any other choice.
      if (status !== 'KEEPING') {
        await updateTicket(ticket.id, { status });
      }

      // A18 — a ticket IS "going": silently clear any interested row so the
      // event moves from INTERESTED to the ticketed section. Fire-and-forget;
      // failures never block or surface in the save flow.
      void promoteInterestedToGoing(String(eventId));

      router.replace({ pathname: '/tickets/success', params: { eventId: String(eventId) } });
    } catch (e) {
      Alert.alert('Could not save ticket', getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: 24, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>Ticket details</Text>
          {eventName ? <Text style={styles.subtitle}>{eventName}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {statuses.map((s) => {
            const active = s === status;
            return (
              <SpringPressable
                key={s}
                onPress={() => setStatus(s)}
                haptic="light"
                style={[styles.segment, active && styles.segmentActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s}</Text>
              </SpringPressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field label="Section" placeholder="101" value={section} onChangeText={setSection} />
          <Field label="Row" placeholder="B" value={row} onChangeText={setRow} />
          <Field label="Seat" placeholder="12" value={seat} onChangeText={setSeat} />
        </View>

        <Field label="Barcode (optional)" placeholder="1234 5678 9012" value={barcode} onChangeText={setBarcode} />

        <View style={{ marginTop: 8 }}>
          <PillButton
            title={isSaving ? 'Saving…' : 'Save ticket'}
            variant="primary"
            size="lg"
            disabled={isSaving}
            onPress={onSave}
            springFeedback
            haptic="medium"
          />
        </View>
      </View>
    </View>
  );
}
