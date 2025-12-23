import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { createLog as createRemoteLog } from '../../lib/api/logs';
import { createOrUpdateLog, deleteLogById, getLogForUserEvent } from '../../lib/local/repo/logsRepo';
import { getDb } from '../../lib/local/db';
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

  const parsedRating = useMemo(() => {
    const n = Number(rating);
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    return Math.min(10, Math.max(1, n));
  }, [rating]);

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

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !eventId) return;

    setIsPrefilling(true);
    getLogForUserEvent(user.id, String(eventId))
      .then((log) => {
        if (cancelled) return;
        if (!log) {
          setExistingLogId(null);
          return;
        }
        setExistingLogId(log.id);
        setRating(typeof log.rating === 'number' ? String(log.rating) : '');
        setNote(log.note ?? '');
        setSection(log.section ?? '');
        setRow(log.row ?? '');
        setSeat(log.seat ?? '');
      })
      .finally(() => {
        if (cancelled) return;
        setIsPrefilling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, user?.id]);

  const onSave = async () => {
    if (!user || !eventId) return;
    setIsSaving(true);
    try {
      await createOrUpdateLog({
        userId: user.id,
        eventId: String(eventId),
        rating: parsedRating,
        note: note.trim() || null,
        section: section.trim() || null,
        row: row.trim() || null,
        seat: seat.trim() || null,
      });

      let newBadgeIds: string[] = [];
      // If this is an API-backed user (not local-only), also create the log remotely so badges can be awarded server-side.
      if (!existingLogId && !user.id.startsWith('user_')) {
        try {
          const res = await createRemoteLog({
            eventId: String(eventId),
            rating: parsedRating ?? undefined,
            note: note.trim() || undefined,
            section: section.trim() || undefined,
            row: row.trim() || undefined,
            seat: seat.trim() || undefined,
            visibility: 'PUBLIC',
          });
          newBadgeIds = (res.newBadges || []).map((b) => b.id);
        } catch (apiErr: any) {
          // Ignore \"Already logged\" on API side.
          if (apiErr?.response?.status !== 409) throw apiErr;
        }
      }

      await refresh();
      router.replace({
        pathname: '/log/success',
        params: {
          eventId: String(eventId),
          ...(newBadgeIds.length ? { newBadges: newBadgeIds.join(',') } : {}),
        },
      });
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
          await deleteLogById(existingLogId);
          await refresh();
          router.replace({ pathname: '/event/[eventId]', params: { eventId: String(eventId) } });
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>
            {existingLogId ? 'Edit log' : 'Add details'}
          </Text>
          {eventName ? <Text style={{ color: colors.textSecondary }}>{eventName}</Text> : null}
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



