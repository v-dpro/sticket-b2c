import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ErrorState } from '../../components/ui/ErrorState';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { getArtistEventsBandsintown, searchEventsByArtist, type SearchEvent } from '../../lib/api/logShow';

export default function TicketsSelectEvent() {
  const router = useRouter();
  const { artistId, artistName } = useLocalSearchParams<{ artistId?: string; artistName?: string }>();

  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: SearchEvent[] = [];
      if (artistId && !String(artistId).startsWith('temp_')) {
        data = await getArtistEventsBandsintown(String(artistId), true);
      } else if (artistName) {
        data = await searchEventsByArtist(String(artistName), true);
      }
      setEvents(data);
    } catch {
      setError('Could not load shows. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [artistId, artistName]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textHi, fontSize: 24, fontWeight: '800' }}>Select the event</Text>
          <Text style={{ color: colors.textMid, fontSize: 16 }}>
            {isLoading ? 'Loading…' : 'Choose your ticket event.'}
          </Text>
        </View>

        {error ? (
          <ErrorState title="Couldn't load shows" message={error} onRetry={fetchEvents} />
        ) : (
          <View style={{ gap: 8 }}>
            {events.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/tickets/details', params: { eventId: e.id } })}
                style={({ pressed }) => ({
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '700' }}>{e.venue.name}</Text>
                <Text style={{ color: colors.textMid, marginTop: 2 }}>
                  {e.venue.city}{e.venue.state ? `, ${e.venue.state}` : ''} • {new Date(e.date).toLocaleDateString()}
                </Text>
              </Pressable>
            ))}

            {!isLoading && events.length === 0 ? (
              <Text style={{ color: colors.textLo, fontSize: 14 }}>No shows found for this artist.</Text>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
