// LOG FLOW · STEP 1b — pick the night. Bandsintown events for the chosen
// artist, split UPCOMING / PAST, with mono date metadata and a manual
// escape hatch. Route contract:
//   in:  { artistId?, artistName?, artistImage? }   (temp_ id → name search)
//   out: push /log/details { eventId, eventName, eventDate, artistId,
//         artistName, artistImage, venueId, venueName, venueCity,
//         venueState, source, externalId }

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { FlowHeader } from '../../components/log/FlowHeader';
import { LogRow } from '../../components/log/LogRow';
import { PillButton } from '../../components/ui/PillButton';
import { getArtistEventsBandsintown, searchEventsByArtist, searchEventsDB, type SearchEvent } from '../../lib/api/logShow';
import { durations, tearIn } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme } from '../../lib/theme-context';

function monoDate(iso: string): { top: string; bottom: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { top: '—', bottom: '' };
  const top = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { top, bottom: String(d.getFullYear()) };
}

export default function SelectEventScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;

  const params = useLocalSearchParams<{
    artistId?: string;
    artistName?: string;
    artistImage?: string;
  }>();

  const artistName = params.artistName || 'Artist';
  const artistImage = params.artistImage ? String(params.artistImage) : null;

  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    // Our OWN real catalog (DB) first — the same TM/Bandsintown shows surfaced
    // across the app. Fall back to the external APIs only when the catalog has
    // nothing for this artist. All fns swallow errors and return [].
    let data: SearchEvent[] = params.artistName ? await searchEventsDB(String(params.artistName)) : [];
    if (data.length === 0) {
      if (params.artistId && !String(params.artistId).startsWith('temp_')) {
        data = await getArtistEventsBandsintown(String(params.artistId), true);
      } else if (params.artistName) {
        data = await searchEventsByArtist(String(params.artistName), true);
      }
    }
    setEvents(data);
    setLoading(false);
  }, [params.artistId, params.artistName]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

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

  const now = Date.now();
  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.date).getTime() >= now),
    [events, now],
  );
  const past = useMemo(
    () =>
      events
        .filter((e) => new Date(e.date).getTime() < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events, now],
  );

  const goManual = () =>
    router.push({ pathname: '/log/create-show', params: { q: artistName } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlowHeader icon="back" label="Pick the night" onPress={goBack} />

      {/* Artist identity */}
      <View
        style={{
          paddingHorizontal: pad,
          paddingTop: 8,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.card2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {artistImage ? (
            <Image source={{ uri: artistImage }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name="person-outline" size={20} color={c.mute} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ color: c.fg, fontSize: 22, fontWeight: '800' }} numberOfLines={1}>
            {artistName}
          </Text>
          <Text style={{ color: c.mute, fontSize: 14, fontWeight: '400' }}>
            Which show were you at?
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="small" color={c.mute} />
          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: c.mute,
            }}
          >
            Finding shows…
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 6 }}>
          <Text style={{ color: c.fg, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
            No shows found
          </Text>
          <Text style={{ color: c.mute, fontSize: 14, fontWeight: '400', textAlign: 'center' }}>
            We couldn’t find any dates for {artistName}. Add yours manually — it takes ten seconds.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <PillButton title="Add it manually" variant="primary" size="md" springFeedback haptic="light" onPress={goManual} />
            <PillButton title="Retry" variant="ghost" size="md" springFeedback haptic="light" onPress={() => void fetchEvents()} />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {past.length > 0 ? (
            <EventSection title="Past" events={past} onSelect={selectEvent} />
          ) : null}
          {upcoming.length > 0 ? (
            <EventSection title="Upcoming" events={upcoming} onSelect={selectEvent} />
          ) : null}

          <View style={{ marginTop: 20 }}>
            <LogRow
              title="Show not listed?"
              subtitle="Add the details yourself"
              icon="add"
              round={false}
              chevron
              separator={false}
              onPress={goManual}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EventSection({
  title,
  events,
  onSelect,
}: {
  title: string;
  events: SearchEvent[];
  onSelect: (e: SearchEvent) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: tokens.colors.mute,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      {events.map((event, i) => {
        const d = monoDate(event.date);
        const openers =
          event.lineup && event.lineup.length > 1 ? `with ${event.lineup.slice(1).join(', ')}` : undefined;
        return (
          <Animated.View key={event.id} entering={tearIn(Math.min(i, 8) * durations.stagger)}>
            <LogRow
              title={event.venue.name}
              subtitle={
                [event.venue.city, event.venue.state].filter(Boolean).join(', ') +
                (openers ? `  ·  ${openers}` : '')
              }
              meta={d.top}
              metaSub={d.bottom}
              separator={i < events.length - 1}
              onPress={() => onSelect(event)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}
