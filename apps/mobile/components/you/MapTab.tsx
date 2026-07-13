// You · MAP — the collection as geography: every venue you've been to,
// pinned on a real map, with the city tallies beneath. Taps go to venues.

import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { getMyCollection, type MyCollection } from '../../lib/api/collection';
import { cityTier } from '../../lib/gamification';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { ProfileMapView } from '../profile/MapView';
import { SpringPressable } from '../ui/SpringPressable';
import { CollectorScorecard } from './CollectorScorecard';
import { TierStamp } from './TierStamp';

export function MapTab() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useSession();
  const [collection, setCollection] = useState<MyCollection | null>(null);

  useEffect(() => {
    let alive = true;
    getMyCollection()
      .then((c) => {
        if (alive) setCollection(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const styles = useThemedStyles((t) => ({
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
    cityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: t.density.pad,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    cityName: { flex: 1, fontSize: 15, fontWeight: '700', color: t.colors.fg },
    // Mono legend under the map — "NEW YORK ×31 · LONDON ×6" (§4 MAP).
    legend: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
      paddingHorizontal: t.density.pad,
      marginTop: 12,
      lineHeight: 17,
    },
    venueBody: { flex: 1, minWidth: 0 },
    venueName: { fontSize: 15, fontWeight: '700', color: t.colors.fg },
    venueCity: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 2,
    },
    countStamp: {
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      borderRadius: t.radius.chip,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    countText: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.fg,
    },
  }));

  const openVenue = useCallback((venueId: string) => router.push(`/venue/${venueId}`), [router]);

  // "NEW YORK ×31 · LONDON ×6" — top cities by visit count.
  const cityLegend = collection?.cities
    ? [...collection.cities]
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map((c) => `${c.city} ×${c.count}`)
        .join('  ·  ')
    : '';

  if (!user) return null;

  return (
    <View>
      {/* Gamified head: rank + venue/city/artist tallies. */}
      {collection ? (
        <CollectorScorecard
          venues={collection.venues.length}
          cities={collection.cities.length}
          artists={collection.artists.length}
        />
      ) : null}

      {/* The pins — ProfileMapView already knows the viewer's venues. */}
      <ProfileMapView userId={user.id} onVenuePress={openVenue} />

      {cityLegend ? <Text style={styles.legend}>{cityLegend}</Text> : null}

      {/* Venues — name + ×N stamp (AVG pending backend). */}
      {collection && collection.venues.length > 0 ? (
        <View>
          <Text style={styles.section}>Venues</Text>
          {collection.venues.map((row) => (
            <SpringPressable
              key={row.venue.id}
              haptic="light"
              onPress={() => openVenue(row.venue.id)}
              accessibilityRole="button"
              accessibilityLabel={`${row.venue.name}, seen ${row.count} times`}
              style={styles.cityRow}
            >
              <Ionicons name="business-outline" size={16} color={tokens.colors.mute} />
              <View style={styles.venueBody}>
                <Text style={styles.venueName} numberOfLines={1}>
                  {row.venue.name}
                </Text>
                {row.venue.city ? (
                  <Text style={styles.venueCity} numberOfLines={1}>
                    {row.venue.city}
                  </Text>
                ) : null}
              </View>
              <View style={styles.countStamp}>
                <Text style={styles.countText}>×{row.count}</Text>
              </View>
            </SpringPressable>
          ))}
        </View>
      ) : null}

      {collection && collection.cities.length > 0 ? (
        <View>
          <Text style={styles.section}>Cities collected</Text>
          {collection.cities.map((row) => (
            <View key={row.city} style={styles.cityRow}>
              <Ionicons name="location-outline" size={16} color={tokens.colors.mute} />
              <Text style={styles.cityName} numberOfLines={1}>
                {row.city}
              </Text>
              <TierStamp tier={cityTier(row.count)} />
              <View style={styles.countStamp}>
                <Text style={styles.countText}>×{row.count}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
