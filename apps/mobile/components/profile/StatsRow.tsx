import React from 'react';
import { Text, View } from 'react-native';

import { useThemedStyles } from '../../lib/theme-context';

interface StatsRowProps {
  shows: number;
  artists: number;
  venues: number;
}

export function StatsRow({ shows, artists, venues }: StatsRowProps) {
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: t.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      marginBottom: 16,
    },
    statItem: {
      alignItems: 'center',
    },
    value: {
      fontSize: 18,
      fontWeight: '700',
      color: t.colors.textHi,
    },
    label: {
      fontSize: 12,
      color: t.colors.textLo,
      marginTop: 2,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.value}>{shows}</Text>
        <Text style={styles.label}>Shows</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.value}>{artists}</Text>
        <Text style={styles.label}>Artists</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.value}>{venues}</Text>
        <Text style={styles.label}>Venues</Text>
      </View>
    </View>
  );
}
