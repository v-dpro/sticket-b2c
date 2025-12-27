import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import debounce from 'lodash/debounce';

import { Screen } from '../../components/ui/Screen';
import { colors, radius, spacing } from '../../lib/theme';
import { searchArtistsSpotify, type SearchArtist } from '../../lib/api/logShow';
import { useSpotifyArtists } from '../../hooks/useSpotifyArtists';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{text}</Text>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{text}</Text>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
      {before}
      <Text style={{ color: colors.brandCyan }}>{match}</Text>
      {after}
    </Text>
  );
}

export default function LogSearchArtist() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const goBack = useSafeBack();

  // Get user's Spotify top artists for suggestions
  const { artists: spotifyArtists, loading: spotifyLoading } = useSpotifyArtists();

  const q = useMemo(() => query.trim(), [query]);

  // Debounced search
  const doSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchArtistsSpotify(searchQuery);
        setResults(data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    doSearch(q);

    return () => {
      doSearch.cancel();
    };
  }, [q, doSearch]);

  const selectArtist = (artist: SearchArtist) => {
    // Save to recent searches
    setRecentSearches((prev) => [artist.name, ...prev.filter((x) => x !== artist.name)].slice(0, 8));

    // Navigate to event selection with artist info
    router.push({
      pathname: '/log/select-event',
      params: {
        artistId: artist.id,
        artistName: artist.name,
        artistImage: artist.imageUrl || '',
      },
    });
  };

  const selectRecent = (text: string) => {
    setQuery(text);
  };

  // Suggested artists from Spotify
  const suggestedArtists = useMemo(() => {
    if (spotifyLoading || !spotifyArtists) return [];
    return spotifyArtists.slice(0, 5);
  }, [spotifyArtists, spotifyLoading]);

  return (
    <Screen padded={false}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" onPress={goBack} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' })}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Log a Show</Text>
        <View style={{ width: 24, height: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }} keyboardShouldPersistTaps="handled">
        {/* Search Bar */}
        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              height: 52,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: isFocused ? colors.brandCyan : colors.border,
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="search"
              size={20}
              color={colors.textTertiary}
              style={{ position: 'absolute', left: 16, top: 16 }}
            />
            <TextInput
              placeholder="Search artist..."
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{ height: 52, paddingLeft: 48, paddingRight: 16, color: colors.textPrimary, fontSize: 16 }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {isLoading ? <ActivityIndicator size="small" color={colors.brandCyan} style={{ position: 'absolute', right: 16 }} /> : null}
          </View>
        </View>

        {/* Search Results */}
        {q.length >= 2 ? (
          <>
            {results.length > 0 ? (
              <View style={{ gap: 8, marginBottom: spacing.lg }}>
                {results.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => selectArtist(a)}
                    style={({ pressed }) => ({
                      backgroundColor: colors.surface,
                      borderRadius: radius.lg,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      opacity: pressed ? 0.92 : 1,
                    })}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.surfaceElevated }}>
                      {a.imageUrl ? (
                        <Image source={{ uri: a.imageUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="person" size={24} color={colors.textTertiary} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <HighlightedText text={a.name} query={q} />
                      {a.genres && a.genres.length > 0 ? (
                        <Text style={{ color: colors.textTertiary, fontSize: 13 }} numberOfLines={1}>
                          {a.genres.slice(0, 3).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            ) : !isLoading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No artists found</Text>
                <Pressable onPress={() => router.push({ pathname: '/log/create-show', params: { q } })} style={{ marginTop: 16 }}>
                  <Text style={{ color: colors.brandCyan, fontSize: 14, fontWeight: '600' }}>Add "{q}" manually →</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 ? (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12 }}>Recent Searches</Text>
                <View style={{ gap: 8 }}>
                  {recentSearches.map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => selectRecent(name)}
                      style={({ pressed }) => ({
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        opacity: pressed ? 0.92 : 1,
                      })}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                      <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>{name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Suggested Artists from Spotify */}
            {suggestedArtists.length > 0 ? (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 4 }}>From Your Spotify</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 12 }}>Artists you listen to</Text>
                <View style={{ gap: 8 }}>
                  {suggestedArtists.map((a) => (
                    <Pressable
                      key={a.id || a.name}
                      onPress={() => {
                        // Spotify top artists are Spotify IDs (not our DB ids) — pass a temp id so the next screen
                        // uses the name-based Bandsintown search endpoint.
                        router.push({
                          pathname: '/log/select-event',
                          params: {
                            artistId: a.id ? `temp_${a.id}` : undefined,
                            artistName: a.name,
                            artistImage: a.images?.[0]?.url || '',
                          },
                        });
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: colors.surface,
                        borderRadius: radius.lg,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        opacity: pressed ? 0.92 : 1,
                      })}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.surfaceElevated }}>
                        {a.images?.[0]?.url ? (
                          <Image source={{ uri: a.images[0].url }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="person" size={24} color={colors.textTertiary} />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{a.name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Manual Entry Option */}
            <Pressable
              onPress={() => router.push('/log/create-show')}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: pressed ? 0.92 : 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
              })}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.brandCyan} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>Add Show Manually</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Can't find it? Enter details yourself</Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}




