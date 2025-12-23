import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { deleteTicket, getTicketById, updateTicket, type TicketStatus } from '../../lib/local/repo/ticketsRepo';

const statuses: TicketStatus[] = ['KEEPING', 'SELLING', 'SOLD'];

export default function EditTicket() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [status, setStatus] = useState<TicketStatus>('KEEPING');
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [seat, setSeat] = useState('');
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!ticketId) return;

    setIsLoading(true);
    getTicketById(String(ticketId))
      .then((t) => {
        if (cancelled) return;
        if (!t) return;
        setEventTitle(`${t.event.artist.name} — ${t.event.venue.name}`);
        setStatus(t.status);
        setSection(t.section ?? '');
        setRow(t.row ?? '');
        setSeat(t.seat ?? '');
        setBarcode(t.barcode ?? '');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const onSave = async () => {
    if (!ticketId) return;
    setIsSaving(true);
    try {
      await updateTicket({
        id: String(ticketId),
        status,
        section: section.trim() || null,
        row: row.trim() || null,
        seat: seat.trim() || null,
        barcode: barcode.trim() || null,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = () => {
    if (!ticketId) return;
    Alert.alert('Delete ticket?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTicket(String(ticketId));
          router.replace('/wallet');
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900' }}>Edit ticket</Text>
          <Text style={{ color: colors.textSecondary }}>{isLoading ? 'Loading…' : eventTitle}</Text>
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
                <Text style={{ color: active ? colors.brandCyan : colors.textSecondary, fontWeight: '800' }}>{s}</Text>
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

        <View style={{ marginTop: spacing.lg, gap: 12 }}>
          <Button label={isSaving ? 'Saving…' : 'Save changes'} disabled={isSaving || isLoading} onPress={onSave} />
          <Button label="Delete ticket" variant="danger" disabled={isSaving || isLoading} onPress={onDelete} />
        </View>
      </View>
    </Screen>
  );
}




