import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, spacing } from '../../lib/theme';
import { searchArtistsSpotify, type SearchArtist } from '../../lib/api/logShow';

export default function TicketsSearchArtist() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const q = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let cancelled = false;
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      searchArtistsSpotify(q)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <Screen>
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textHi, fontSize: 28, fontWeight: '800' }}>Add a ticket</Text>
          <Text style={{ color: colors.textMid, fontSize: 16 }}>Search an artist to find the event.</Text>
        </View>

        <TextField placeholder="Search artists" value={query} onChangeText={setQuery} />

        <Text style={{ color: colors.textLo, fontSize: 12 }}>{isLoading ? 'Searching…' : ' '}</Text>

        <View style={{ gap: 8 }}>
          {results.map((a) => (
            <Pressable
              key={a.id}
              onPress={() =>
                router.push({
                  pathname: '/tickets/select-event',
                  params: { artistId: a.id, artistName: a.name, artistImage: a.imageUrl || '' },
                })
              }
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.hairline,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '600' }}>{a.name}</Text>
              {a.genres.length ? (
                <Text style={{ color: colors.textLo, fontSize: 12, marginTop: 4 }}>{a.genres.join(' • ')}</Text>
              ) : null}
            </Pressable>
          ))}

          {q.length >= 2 && !isLoading && results.length === 0 ? (
            <Text style={{ color: colors.textLo, fontSize: 14 }}>No artists found.</Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
