import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { addTicket, updateTicket } from '../../lib/api/tickets';
import { getEvent } from '../../lib/api/events';
import { getErrorMessage } from '../../lib/api/errorUtils';
import type { TicketStatus } from '../../types/ticket';
import { useSession } from '../../hooks/useSession';

const statuses: TicketStatus[] = ['KEEPING', 'SELLING', 'SOLD'];

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

      router.replace({ pathname: '/tickets/success', params: { eventId: String(eventId) } });
    } catch (e) {
      Alert.alert('Could not save ticket', getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textHi, fontSize: 24, fontWeight: '800' }}>Ticket details</Text>
          {eventName ? <Text style={{ color: colors.textMid }}>{eventName}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {statuses.map((s) => {
            const active = s === status;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? colors.brandCyan : colors.hairline,
                  backgroundColor: active ? colors.elevated : colors.surface,
                  opacity: pressed ? 0.85 : 1,
                  alignItems: 'center',
                })}
              >
                <Text style={{ color: active ? colors.brandCyan : colors.textMid, fontWeight: '700' }}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Section" placeholder="101" value={section} onChangeText={setSection} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Row" placeholder="B" value={row} onChangeText={setRow} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Seat" placeholder="12" value={seat} onChangeText={setSeat} />
          </View>
        </View>

        <TextField label="Barcode (optional)" placeholder="1234 5678 9012" value={barcode} onChangeText={setBarcode} />

        <View style={{ marginTop: spacing.lg }}>
          <Button label={isSaving ? 'Saving…' : 'Save ticket'} disabled={isSaving} onPress={onSave} />
        </View>
      </View>
    </Screen>
  );
}
