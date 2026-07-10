import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { createLog, deleteLog, updateLog } from '../../lib/api/logs';
import { getEvent } from '../../lib/api/events';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { useSession } from '../../hooks/useSession';

export default function LogDetails() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user, refresh } = useSession();

  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [rating, setRating] = useState('');
  const [note, setNote] = useState('');
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [seat, setSeat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const parsedRating = useMemo(() => {
    const n = Number(rating);
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    return Math.min(10, Math.max(1, n));
  }, [rating]);

  const [eventName, setEventName] = useState<string>('');

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setIsPrefilling(true);
    setLoadError(null);
    try {
      // /events/:id also carries the signed-in user's log for prefill.
      const event = await getEvent(String(eventId));
      setEventName(event.name ?? '');

      const log = event.userLog;
      if (log) {
        setExistingLogId(log.id);
        setRating(typeof log.rating === 'number' ? String(log.rating) : '');
        setNote(log.note ?? '');
        setSection(log.section ?? '');
        setRow(log.row ?? '');
        setSeat(log.seat ?? '');
      } else {
        setExistingLogId(null);
      }
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setIsPrefilling(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  const onSave = async () => {
    if (!user || !eventId) return;
    setIsSaving(true);
    try {
      if (existingLogId) {
        await updateLog(existingLogId, {
          rating: parsedRating,
          note: note.trim() || null,
          section: section.trim() || null,
          row: row.trim() || null,
          seat: seat.trim() || null,
        });

        await refresh();
        router.replace({ pathname: '/log/success', params: { eventId: String(eventId) } });
        return;
      }

      const res = await createLog({
        eventId: String(eventId),
        rating: parsedRating ?? undefined,
        note: note.trim() || undefined,
        section: section.trim() || undefined,
        row: row.trim() || undefined,
        seat: seat.trim() || undefined,
        visibility: 'PUBLIC',
      });

      await refresh();

      // Pass the server-computed rewards to the reveal screen. The screen
      // falls back to a client-side preview when these are absent.
      const badges = (res.newBadges ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description,
      }));

      router.replace({
        pathname: '/log/success',
        params: {
          eventId: String(eventId),
          ...(typeof res.xpGain === 'number' ? { xpGain: String(res.xpGain) } : {}),
          ...(typeof res.xpAfter === 'number' ? { xpAfter: String(res.xpAfter) } : {}),
          ...(res.leveledUp ? { leveledUp: '1' } : {}),
          ...(badges.length ? { badges: JSON.stringify(badges) } : {}),
        },
      });
    } catch (apiErr: any) {
      // Already logged on the API side — treat as success and let the user edit.
      if (apiErr?.response?.status === 409) {
        await refresh();
        router.replace({ pathname: '/log/success', params: { eventId: String(eventId) } });
        return;
      }
      Alert.alert('Could not save log', getErrorMessage(apiErr));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async () => {
    if (!user?.id || !eventId || !existingLogId) return;
    Alert.alert('Delete log?', 'This will remove your rating and notes for this show.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(existingLogId);
            await refresh();
            router.replace({ pathname: '/event/[eventId]', params: { eventId: String(eventId) } });
          } catch (e) {
            Alert.alert('Could not delete log', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loadError) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState title="Couldn't load show" message={loadError} onRetry={loadEvent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textHi, fontSize: 24, fontWeight: '800' }}>
            {existingLogId ? 'Edit log' : 'Add details'}
          </Text>
          {eventName ? <Text style={{ color: colors.textMid }}>{eventName}</Text> : null}
        </View>

        <TextField label="Rating (1-10)" keyboardType="numeric" placeholder="9" value={rating} onChangeText={setRating} />
        <TextField label="Note" placeholder="Best night ever" value={note} onChangeText={setNote} />

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

        <View style={{ marginTop: spacing.lg, gap: 12 }}>
          <Button
            label={isSaving || isPrefilling ? 'Saving…' : existingLogId ? 'Save changes' : 'Save log'}
            disabled={isSaving || isPrefilling}
            onPress={onSave}
          />
          {existingLogId ? (
            <Button label="Delete log" variant="danger" disabled={isSaving || isPrefilling} onPress={onDelete} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
