import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

interface StatsRowProps {
  shows: number;
  artists: number;
  venues: number;
}

export function StatsRow({ shows, artists, venues }: StatsRowProps) {
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHi,
  },
  label: {
    fontSize: 12,
    color: colors.textLo,
    marginTop: 2,
  },
});




