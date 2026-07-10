import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { deleteTicket, getTicket, updateTicket } from '../../lib/api/tickets';
import { getErrorMessage } from '../../lib/api/errorUtils';
import type { TicketStatus } from '../../types/ticket';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

const statuses: TicketStatus[] = ['KEEPING', 'SELLING', 'SOLD'];

export default function EditTicket() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const goBack = useSafeBack();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [eventTitle, setEventTitle] = useState('');
  const [status, setStatus] = useState<TicketStatus>('KEEPING');
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [seat, setSeat] = useState('');
  const [barcode, setBarcode] = useState('');

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const t = await getTicket(String(ticketId));
      setEventTitle(`${t.event.artist.name} — ${t.event.venue.name}`);
      setStatus(t.status);
      setSection(t.section ?? '');
      setRow(t.row ?? '');
      setSeat(t.seat ?? '');
      setBarcode(t.barcode ?? '');
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const onSave = async () => {
    if (!ticketId) return;
    setIsSaving(true);
    try {
      await updateTicket(String(ticketId), {
        status,
        section: section.trim(),
        row: row.trim(),
        seat: seat.trim(),
        barcode: barcode.trim(),
      });
      goBack();
    } catch (e) {
      Alert.alert('Could not save ticket', getErrorMessage(e));
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
          try {
            await deleteTicket(String(ticketId));
            router.replace('/wallet');
          } catch (e) {
            Alert.alert('Could not delete ticket', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loadError) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState title="Couldn't load ticket" message={loadError} onRetry={loadTicket} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textHi, fontSize: 24, fontWeight: '900' }}>Edit ticket</Text>
          <Text style={{ color: colors.textMid }}>{isLoading ? 'Loading…' : eventTitle}</Text>
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
                <Text style={{ color: active ? colors.brandCyan : colors.textMid, fontWeight: '800' }}>{s}</Text>
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
