// You · COLLECTION — the trophy case: artists by times seen, venues
// visited, cities reached. Counts are flat stamps; rows tap through.

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { getMyCollection, type MyCollection } from '../../lib/api/collection';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { durations, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { ErrorState } from '../ui/ErrorState';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

export function CollectionTab() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [data, setData] = useState<MyCollection | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getMyCollection());
      setStatus('ready');
    } catch (e) {
      setErrorMsg(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const styles = useThemedStyles((t) => ({
    center: { paddingVertical: 60, alignItems: 'center' },
    section: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 18,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.card2 },
    iconWrap: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0, gap: 3 },
    name: { fontSize: 15.5, fontWeight: '700', color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    countStamp: {
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.chip,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    countText: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.fg,
    },
    empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    emptySub: { fontSize: 13.5, color: t.colors.mute, textAlign: 'center' },
  }));

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.colors.mute} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ paddingVertical: 40, paddingHorizontal: 20 }}>
        <ErrorState title="Couldn't load your collection" message={errorMsg ?? undefined} onRetry={() => void load()} />
      </View>
    );
  }

  const empty = !data || (data.artists.length === 0 && data.venues.length === 0);
  if (empty) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nothing collected yet</Text>
        <Text style={styles.emptySub}>Every show you log stamps an artist, a venue, and a city into your collection.</Text>
        <PillButton title="Log a show" springFeedback haptic="light" onPress={() => router.push('/log/search')} />
      </View>
    );
  }

  let i = 0;
  return (
    <View>
      {data.artists.length > 0 ? (
        <View>
          <Text style={styles.section}>Artists seen</Text>
          {data.artists.map((row) => {
            const idx = i++;
            return (
              <Animated.View key={row.artist.id} entering={tearIn(Math.min(idx, 8) * durations.stagger)}>
                <SpringPressable
                  haptic="light"
                  onPress={() => router.push(`/artist/${row.artist.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.artist.name}, seen ${row.count} times`}
                  style={styles.row}
                >
                  {row.artist.imageUrl ? (
                    <Image source={{ uri: row.artist.imageUrl }} style={styles.avatar} contentFit="cover" transition={80} cachePolicy="memory-disk" />
                  ) : (
                    <View style={[styles.avatar, styles.iconWrap]}>
                      <Ionicons name="musical-notes-outline" size={16} color={tokens.colors.mute} />
                    </View>
                  )}
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.artist.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      LAST {new Date(row.lastSeen).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.countStamp}>
                    <Text style={styles.countText}>×{row.count}</Text>
                  </View>
                </SpringPressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      {data.venues.length > 0 ? (
        <View>
          <Text style={styles.section}>Venues</Text>
          {data.venues.map((row) => {
            const idx = i++;
            return (
              <Animated.View key={row.venue.id} entering={tearIn(Math.min(idx, 8) * durations.stagger)}>
                <SpringPressable
                  haptic="light"
                  onPress={() => router.push(`/venue/${row.venue.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.venue.name}, ${row.count} shows`}
                  style={styles.row}
                >
                  <View style={[styles.avatar, styles.iconWrap]}>
                    <Ionicons name="business-outline" size={16} color={tokens.colors.mute} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.venue.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {row.venue.city.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.countStamp}>
                    <Text style={styles.countText}>×{row.count}</Text>
                  </View>
                </SpringPressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      {data.cities.length > 0 ? (
        <View>
          <Text style={styles.section}>Cities</Text>
          {data.cities.map((row) => {
            const idx = i++;
            return (
              <Animated.View key={row.city} entering={tearIn(Math.min(idx, 8) * durations.stagger)}>
                <View style={styles.row}>
                  <View style={[styles.avatar, styles.iconWrap]}>
                    <Ionicons name="location-outline" size={16} color={tokens.colors.mute} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.city}
                    </Text>
                  </View>
                  <View style={styles.countStamp}>
                    <Text style={styles.countText}>×{row.count}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
