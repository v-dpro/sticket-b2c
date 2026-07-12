// You · MAP — the collection as geography: every venue you've been to,
// pinned on a real map, with the city tallies beneath. Taps go to venues.

import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { getMyCollection, type MyCollection } from '../../lib/api/collection';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { ProfileMapView } from '../profile/MapView';
import { SpringPressable } from '../ui/SpringPressable';

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

  if (!user) return null;

  return (
    <View>
      {/* The pins — ProfileMapView already knows the viewer's venues. */}
      <ProfileMapView userId={user.id} onVenuePress={openVenue} />

      {collection && collection.cities.length > 0 ? (
        <View>
          <Text style={styles.section}>Cities</Text>
          {collection.cities.map((row) => (
            <View key={row.city} style={styles.cityRow}>
              <Ionicons name="location-outline" size={16} color={tokens.colors.mute} />
              <Text style={styles.cityName} numberOfLines={1}>
                {row.city}
              </Text>
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
