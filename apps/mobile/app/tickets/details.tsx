import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { createTicket, type TicketStatus } from '../../lib/local/repo/ticketsRepo';
import { getDb } from '../../lib/local/db';
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
    (async () => {
      const db = await getDb();
      const row = await db.getFirstAsync<{ name: string }>('SELECT name FROM events WHERE id = ? LIMIT 1', String(eventId));
      if (cancelled) return;
      setEventName(row?.name ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const onSave = async () => {
    if (!user || !eventId) return;
    setIsSaving(true);
    try {
      await createTicket({
        userId: user.id,
        eventId: String(eventId),
        section: section.trim() || null,
        row: row.trim() || null,
        seat: seat.trim() || null,
        barcode: barcode.trim() || null,
        status,
      });
      router.replace({ pathname: '/tickets/success', params: { eventId: String(eventId) } });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>Ticket details</Text>
          {eventName ? <Text style={{ color: colors.textSecondary }}>{eventName}</Text> : null}
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
                  borderColor: active ? colors.brandCyan : colors.border,
                  backgroundColor: active ? colors.surfaceElevated : colors.surface,
                  opacity: pressed ? 0.85 : 1,
                  alignItems: 'center',
                })}
              >
                <Text style={{ color: active ? colors.brandCyan : colors.textSecondary, fontWeight: '700' }}>{s}</Text>
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



