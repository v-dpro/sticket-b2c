// LOG FLOW · STEP 1c — manual show entry, for nights the databases missed.
// Route contract:
//   in:  { q?, artistName? }  (prefills the artist field)
//   out: importEvent → replace /log/details { eventId }

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowHeader } from '../../components/log/FlowHeader';
import { LogField } from '../../components/log/LogField';
import { PillButton } from '../../components/ui/PillButton';
import { importEvent } from '../../lib/api/events';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme } from '../../lib/theme-context';

function toIsoDate(dateStr: string): string | null {
  // Accept YYYY-MM-DD; noon UTC so the day doesn't shift when formatted locally.
  const s = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CreateShow() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;

  const { q, artistName } = useLocalSearchParams<{ q?: string; artistName?: string }>();
  const initialArtist = typeof artistName === 'string' ? artistName : typeof q === 'string' ? q : '';

  const [artist, setArtist] = useState(initialArtist);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateIso = useMemo(() => toIsoDate(date), [date]);
  const canSave =
    artist.trim().length >= 2 && venue.trim().length >= 2 && city.trim().length >= 2 && Boolean(dateIso);

  const onCreate = async () => {
    if (!canSave || !dateIso || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const event = await importEvent({
        artistName: artist.trim(),
        venueName: venue.trim(),
        venueCity: city.trim(),
        venueCountry: 'US',
        date: dateIso,
      });
      router.replace({ pathname: '/log/details', params: { eventId: event.id } });
    } catch (e) {
      setError(getErrorMessage(e));
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlowHeader icon="back" label="Add it yourself" onPress={goBack} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: 8, paddingBottom: 24, gap: 6 }}>
            <Text style={{ color: c.fg, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
              Create the show
            </Text>
            <Text style={{ color: c.mute, fontSize: 15, fontWeight: '400' }}>
              Not every night makes the listings.
            </Text>
          </View>

          <View style={{ gap: 18 }}>
            <LogField
              label="Artist"
              placeholder="The Weeknd"
              value={artist}
              onChangeText={setArtist}
              autoCapitalize="words"
            />
            <LogField
              label="Venue"
              placeholder="Madison Square Garden"
              value={venue}
              onChangeText={setVenue}
              autoCapitalize="words"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <LogField label="City" placeholder="New York" value={city} onChangeText={setCity} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <LogField label="State" placeholder="NY" value={state} onChangeText={setState} autoCapitalize="characters" />
              </View>
            </View>
            <LogField
              label="Date"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              mono
              keyboardType="numbers-and-punctuation"
              errorText={date.trim().length >= 10 && !dateIso ? 'Use YYYY-MM-DD' : undefined}
            />
          </View>

          {error ? (
            <Text style={{ color: c.error, fontSize: 13, fontWeight: '400', marginTop: 16 }}>{error}</Text>
          ) : null}

          <View style={{ marginTop: 28, gap: 12 }}>
            <PillButton
              title={isSaving ? 'Creating…' : 'Create & log'}
              variant="primary"
              size="lg"
              springFeedback
              haptic="medium"
              disabled={!canSave || isSaving}
              onPress={onCreate}
            />
            <PillButton title="Cancel" variant="ghost" size="lg" springFeedback disabled={isSaving} onPress={goBack} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
