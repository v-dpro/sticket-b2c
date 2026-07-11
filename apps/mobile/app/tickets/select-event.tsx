import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ErrorState } from '../../components/ui/ErrorState';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useThemedStyles } from '../../lib/theme-context';
import { getArtistEventsBandsintown, searchEventsByArtist, type SearchEvent } from '../../lib/api/logShow';

export default function TicketsSelectEvent() {
  const router = useRouter();
  const { artistId, artistName } = useLocalSearchParams<{ artistId?: string; artistName?: string }>();

  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: 24 },
    title: { color: t.colors.fg, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: t.colors.mute, fontSize: 16 },
    row: {
      padding: 14,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    rowTitle: { color: t.colors.fg, fontSize: 16, fontWeight: '700' },
    rowMeta: { color: t.colors.mute, marginTop: 2 },
    empty: { color: t.colors.muteSoft, fontSize: 14 },
  }));

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
    <View style={styles.screen}>
      <View style={{ paddingTop: 24, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>Select the event</Text>
          <Text style={styles.subtitle}>{isLoading ? 'Loading…' : 'Choose your ticket event.'}</Text>
        </View>

        {error ? (
          <ErrorState title="Couldn't load shows" message={error} onRetry={fetchEvents} />
        ) : (
          <View style={{ gap: 8 }}>
            {events.map((e) => (
              <SpringPressable
                key={e.id}
                onPress={() => router.push({ pathname: '/tickets/details', params: { eventId: e.id } })}
                haptic="light"
                style={styles.row}
                accessibilityRole="button"
              >
                <Text style={styles.rowTitle}>{e.venue.name}</Text>
                <Text style={styles.rowMeta}>
                  {e.venue.city}{e.venue.state ? `, ${e.venue.state}` : ''} • {new Date(e.date).toLocaleDateString()}
                </Text>
              </SpringPressable>
            ))}

            {!isLoading && events.length === 0 ? (
              <Text style={styles.empty}>No shows found for this artist.</Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
