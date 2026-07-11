import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { deleteTicket, getTicket, updateTicket } from '../../lib/api/tickets';
import { getErrorMessage } from '../../lib/api/errorUtils';
import type { TicketStatus } from '../../types/ticket';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

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
    <View style={{ flex: 1 }}>
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
      <View style={styles.screen}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState title="Couldn't load ticket" message={loadError} onRetry={loadTicket} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: 24, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text style={styles.title}>Edit ticket</Text>
          <Text style={styles.subtitle}>{isLoading ? 'Loading…' : eventTitle}</Text>
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

        <View style={{ marginTop: 8, gap: 12 }}>
          <PillButton
            title={isSaving ? 'Saving…' : 'Save changes'}
            variant="primary"
            size="lg"
            disabled={isSaving || isLoading}
            onPress={onSave}
            springFeedback
            haptic="medium"
          />
          <PillButton
            title="Delete ticket"
            variant="ghost"
            size="lg"
            disabled={isSaving || isLoading}
            onPress={onDelete}
            springFeedback
            haptic="heavy"
          />
        </View>
      </View>
    </View>
  );
}
