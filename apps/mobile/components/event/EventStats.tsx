import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface EventStatsProps {
  logCount: number;
  avgRating?: number;
  interestedCount: number;
}

export function EventStats({ logCount, avgRating, interestedCount }: EventStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Ionicons name="people" size={20} color="#8B5CF6" />
        <Text style={styles.statValue}>{logCount}</Text>
        <Text style={styles.statLabel}>were there</Text>
      </View>

      {typeof avgRating === 'number' ? (
        <View style={styles.stat}>
          <Ionicons name="star" size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>avg rating</Text>
        </View>
      ) : null}

      <View style={styles.stat}>
        <Ionicons name="heart" size={20} color="#EF4444" />
        <Text style={styles.statValue}>{interestedCount}</Text>
        <Text style={styles.statLabel}>interested</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: -40,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 2,
  },
});



