import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { getEventsByArtist, type Event } from '../../lib/local/repo/eventsRepo';

export default function TicketsSelectEvent() {
  const router = useRouter();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!artistId) return;

    setIsLoading(true);
    getEventsByArtist(String(artistId))
      .then((e) => {
        if (cancelled) return;
        setEvents(e);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artistId]);

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>Select the event</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{isLoading ? 'Loading…' : 'Choose your ticket event.'}</Text>
        </View>

        <View style={{ gap: 8 }}>
          {events.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push({ pathname: '/tickets/details', params: { eventId: e.id } })}
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>{e.venue.name}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                {e.venue.city}{e.venue.state ? `, ${e.venue.state}` : ''} • {new Date(e.date).toLocaleDateString()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}



