import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { createOrGetArtistByName, createOrGetEvent, createOrGetVenue } from '../../lib/local/repo/eventsRepo';

function toIsoDate(dateStr: string) {
  // Accept YYYY-MM-DD and convert to an ISO timestamp (no timezone surprises for MVP)
  const s = dateStr.trim();
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s);
  if (!m) return null;
  // Use noon UTC so it doesn't shift a day when formatted locally.
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

export default function CreateShow() {
  const router = useRouter();
  const { q, artistName } = useLocalSearchParams<{ q?: string; artistName?: string }>();

  const initialArtist = typeof artistName === 'string' ? artistName : typeof q === 'string' ? q : '';
  const [artistNameState, setArtistNameState] = useState(initialArtist);
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateIso = useMemo(() => toIsoDate(date), [date]);
  const canSave = useMemo(() => {
    return artistNameState.trim().length >= 2 && venueName.trim().length >= 2 && city.trim().length >= 2 && Boolean(dateIso);
  }, [artistNameState, venueName, city, dateIso]);

  const onCreate = async () => {
    setError(null);
    if (!canSave || !dateIso) return;

    setIsSaving(true);
    try {
      const artist = await createOrGetArtistByName(artistNameState);
      const venue = await createOrGetVenue({
        name: venueName,
        city,
        state: state.trim() || null,
        country: 'USA',
      });

      const event = await createOrGetEvent({
        artistId: artist.id,
        venueId: venue.id,
        artistName: artist.name,
        dateIso,
      });

      router.replace({ pathname: '/log/details', params: { eventId: event.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create show');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900' }}>Create show</Text>
          <Text style={{ color: colors.textSecondary }}>Can’t find it? Add it manually.</Text>
        </View>

        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

        <TextField label="Artist" placeholder="The Weeknd" value={artistNameState} onChangeText={setArtistNameState} />
        <TextField label="Venue" placeholder="Madison Square Garden" value={venueName} onChangeText={setVenueName} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 2 }}>
            <TextField label="City" placeholder="New York" value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="State" placeholder="NY" value={state} onChangeText={setState} />
          </View>
        </View>
        <TextField label="Date" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />

        <View style={{ marginTop: spacing.md, gap: 12 }}>
          <Button label={isSaving ? 'Creating…' : 'Create & log'} disabled={!canSave || isSaving} onPress={onCreate} />
          <Button label="Cancel" variant="secondary" disabled={isSaving} onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}




