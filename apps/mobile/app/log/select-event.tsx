import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import { Screen } from '../../components/ui/Screen';
import { colors, radius, spacing } from '../../lib/theme';
import { getArtistEventsBandsintown, searchEventsByArtist, type SearchEvent } from '../../lib/api/logShow';

export default function SelectEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    artistId?: string;
    artistName?: string;
    artistImage?: string;
  }>();

  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(true);

  const artistName = params.artistName || 'Artist';
  const artistImage = params.artistImage || null;

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        let data: SearchEvent[] = [];

        if (params.artistId && !String(params.artistId).startsWith('temp_')) {
          // We have a real artist ID, use it
          data = await getArtistEventsBandsintown(String(params.artistId), showPast);
        } else if (params.artistName) {
          // No ID, search by name
          data = await searchEventsByArtist(String(params.artistName), showPast);
        }

        setEvents(data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [params.artistId, params.artistName, showPast]);

  const selectEvent = (event: SearchEvent) => {
    router.push({
      pathname: '/log/details',
      params: {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        artistId: event.artist.id,
        artistName: event.artist.name,
        artistImage: event.artist.imageUrl || '',
        venueId: event.venue.id,
        venueName: event.venue.name,
        venueCity: event.venue.city,
        venueState: event.venue.state || '',
        source: event.source,
        externalId: event.externalId || '',
      },
    });
  };

  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date());
  const pastEvents = events.filter((e) => new Date(e.date) < new Date());

  return (
    <Screen padded={false}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>

        {artistImage ? <Image source={{ uri: String(artistImage) }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : null}

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
            {artistName}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Select a show to log</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.brandCyan} />
          <Text style={{ color: colors.textTertiary, marginTop: 12 }}>Finding shows...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
            No shows found
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            We couldn't find any shows for this artist. You can add it manually.
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: '/log/create-show', params: { q: artistName } })}
            style={{
              marginTop: 24,
              backgroundColor: colors.brandPurple,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: radius.md,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Add Manually</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Upcoming Shows */}
          {upcomingEvents.length > 0 ? (
            <View style={{ marginBottom: spacing.xl }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Upcoming Shows</Text>
              <View style={{ gap: 8 }}>
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} onSelect={selectEvent} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Past Shows */}
          {pastEvents.length > 0 ? (
            <View style={{ marginBottom: spacing.xl }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Past Shows</Text>
              <View style={{ gap: 8 }}>
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} onSelect={selectEvent} isPast />
                ))}
              </View>
            </View>
          ) : null}

          {/* Manual Entry */}
          <Pressable
            onPress={() => router.push({ pathname: '/log/create-show', params: { q: artistName } })}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.brandCyan} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>Add Different Show</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Show not listed? Enter details manually</Text>
            </View>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

function EventCard({
  event,
  onSelect,
  isPast = false,
}: {
  event: SearchEvent;
  onSelect: (e: SearchEvent) => void;
  isPast?: boolean;
}) {
  const date = new Date(event.date);
  const formattedDate = format(date, 'MMM d, yyyy');
  const formattedTime = format(date, 'h:mm a');

  return (
    <Pressable
      onPress={() => onSelect(event)}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        opacity: pressed ? 0.92 : isPast ? 0.8 : 1,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
            {event.venue.name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
            {event.venue.city}
            {event.venue.state ? `, ${event.venue.state}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: isPast ? colors.textTertiary : colors.brandCyan, fontSize: 13, fontWeight: '600' }}>
            {formattedDate}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{formattedTime}</Text>
        </View>
      </View>

      {event.lineup && event.lineup.length > 1 ? (
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 8 }} numberOfLines={1}>
          with {event.lineup.slice(1).join(', ')}
        </Text>
      ) : null}
    </Pressable>
  );
}




