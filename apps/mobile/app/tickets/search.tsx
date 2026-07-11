import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { searchArtistsSpotify, type SearchArtist } from '../../lib/api/logShow';

export default function TicketsSearchArtist() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const q = useMemo(() => query.trim(), [query]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: 24 },
    title: { color: t.colors.fg, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: t.colors.mute, fontSize: 16 },
    input: {
      height: 48,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: 14,
      color: t.colors.fg,
      fontSize: 16,
    },
    status: { color: t.colors.muteSoft, fontSize: 12 },
    row: {
      padding: 14,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    rowTitle: { color: t.colors.fg, fontSize: 16, fontWeight: '600' },
    rowMeta: { color: t.colors.muteSoft, fontSize: 12, marginTop: 4 },
    empty: { color: t.colors.muteSoft, fontSize: 14 },
  }));

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
    <View style={styles.screen}>
      <View style={{ paddingTop: 24, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>Add a ticket</Text>
          <Text style={styles.subtitle}>Search an artist to find the event.</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Search artists"
          placeholderTextColor={tokens.colors.muteSoft}
          value={query}
          onChangeText={setQuery}
        />

        <Text style={styles.status}>{isLoading ? 'Searching…' : ' '}</Text>

        <View style={{ gap: 8 }}>
          {results.map((a) => (
            <SpringPressable
              key={a.id}
              onPress={() =>
                router.push({
                  pathname: '/tickets/select-event',
                  params: { artistId: a.id, artistName: a.name, artistImage: a.imageUrl || '' },
                })
              }
              haptic="light"
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.rowTitle}>{a.name}</Text>
              {a.genres.length ? <Text style={styles.rowMeta}>{a.genres.join(' • ')}</Text> : null}
            </SpringPressable>
          ))}

          {q.length >= 2 && !isLoading && results.length === 0 ? (
            <Text style={styles.empty}>No artists found.</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
