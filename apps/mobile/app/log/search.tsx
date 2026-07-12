// LOG FLOW · STEP 1a — "What show?" Artist search (Spotify-backed) with
// recents, your-Spotify suggestions, and a manual-entry escape hatch.
// Route contract (entry points: FAB, timeline empty state, onboarding):
//   /log/search → push /log/select-event { artistId, artistName, artistImage }
//               → push /log/create-show { q }

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { FlowHeader } from '../../components/log/FlowHeader';
import { LogRow } from '../../components/log/LogRow';
import { PillButton } from '../../components/ui/PillButton';
import { searchArtistsSpotify, type SearchArtist } from '../../lib/api/logShow';
import { durations, tearIn } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';
import { useSpotifyArtists } from '../../hooks/useSpotifyArtists';

const SEARCH_DEBOUNCE_MS = 300;

export default function LogSearchArtist() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  const q = useMemo(() => query.trim(), [query]);

  // Debounced Spotify artist search.
  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    let alive = true;
    const timer = setTimeout(async () => {
      const data = await searchArtistsSpotify(q); // returns [] on error
      if (!alive) return;
      setResults(data);
      setIsLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const { artists: spotifyArtists } = useSpotifyArtists();
  const suggested = useMemo(() => spotifyArtists.slice(0, 5), [spotifyArtists]);

  const selectArtist = (artist: SearchArtist) => {
    setRecents((prev) => [artist.name, ...prev.filter((x) => x !== artist.name)].slice(0, 8));
    router.push({
      pathname: '/log/select-event',
      params: {
        artistId: artist.id,
        artistName: artist.name,
        artistImage: artist.imageUrl || '',
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* No close button — the modal dismisses with swipe-down (grabber hints it). */}
      <FlowHeader icon="none" label="Log a show" grabber />

      <View style={{ paddingHorizontal: pad, paddingTop: 8, paddingBottom: 16, gap: 6 }}>
        <Text style={{ color: c.fg, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
          What show?
        </Text>
        <Text style={{ color: c.mute, fontSize: 15, fontWeight: '400' }}>Start with the artist.</Text>
      </View>

      {/* Search field */}
      <View style={{ paddingHorizontal: pad, marginBottom: 8 }}>
        <View
          style={{
            height: 52,
            backgroundColor: c.card,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: isFocused ? c.accentLine : c.hairline,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          <Ionicons name="search" size={18} color={c.mute} />
          <TextInput
            placeholder="Search artists"
            placeholderTextColor={c.muteSoft}
            selectionColor={c.accent}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{ flex: 1, height: 52, color: c.fg, fontSize: 16, fontWeight: '400' }}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            returnKeyType="search"
          />
          {isLoading ? <ActivityIndicator size="small" color={c.mute} /> : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {q.length >= 2 ? (
          results.length > 0 ? (
            <View>
              {results.map((a, i) => (
                <Animated.View key={a.id} entering={tearIn(Math.min(i, 8) * durations.stagger)}>
                  <LogRow
                    title={a.name}
                    subtitle={a.genres?.slice(0, 3).join(', ') || undefined}
                    imageUrl={a.imageUrl}
                    icon="person-outline"
                    chevron
                    separator={i < results.length - 1}
                    onPress={() => selectArtist(a)}
                  />
                </Animated.View>
              ))}
            </View>
          ) : !isLoading ? (
            <View style={{ paddingVertical: 56, alignItems: 'center', gap: 6 }}>
              <Text style={{ color: c.fg, fontSize: 16, fontWeight: '600' }}>
                Nothing for “{q}”
              </Text>
              <Text style={{ color: c.mute, fontSize: 14, fontWeight: '400', textAlign: 'center' }}>
                Some artists never make the databases.
              </Text>
              <View style={{ marginTop: 16 }}>
                <PillButton
                  title="Add it manually"
                  variant="ghost"
                  size="md"
                  springFeedback
                  haptic="light"
                  onPress={() => router.push({ pathname: '/log/create-show', params: { q } })}
                />
              </View>
            </View>
          ) : null
        ) : (
          <View style={{ gap: 28, paddingTop: 8 }}>
            {recents.length > 0 ? (
              <View>
                <SectionLabel text="Recent" />
                {recents.map((name, i) => (
                  <LogRow
                    key={name}
                    title={name}
                    icon="time-outline"
                    chevron
                    separator={i < recents.length - 1}
                    onPress={() => setQuery(name)}
                  />
                ))}
              </View>
            ) : null}

            {suggested.length > 0 ? (
              <View>
                <SectionLabel text="From your Spotify" />
                {suggested.map((a, i) => (
                  <LogRow
                    key={a.id || a.name}
                    title={a.name}
                    subtitle={a.genres?.slice(0, 2).join(', ') || undefined}
                    imageUrl={a.images?.[0]?.url}
                    icon="person-outline"
                    chevron
                    separator={i < suggested.length - 1}
                    onPress={() =>
                      // Spotify top artists carry Spotify IDs, not our DB ids —
                      // the temp_ prefix routes the next screen to the
                      // name-based Bandsintown search.
                      router.push({
                        pathname: '/log/select-event',
                        params: {
                          artistId: a.id ? `temp_${a.id}` : undefined,
                          artistName: a.name,
                          artistImage: a.images?.[0]?.url || '',
                        },
                      })
                    }
                  />
                ))}
              </View>
            ) : null}

            <View>
              <SectionLabel text="Or" />
              <LogRow
                title="Add a show manually"
                subtitle="Can’t find it? Enter the details yourself"
                icon="add"
                round={false}
                chevron
                separator={false}
                onPress={() => router.push('/log/create-show')}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { tokens } = useTheme();
  return (
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
      {text}
    </Text>
  );
}
