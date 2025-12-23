import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 2,
  },
});




