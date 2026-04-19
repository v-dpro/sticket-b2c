import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../lib/theme';
import { StatPill } from '../ui/StatPill';

interface EventStatsProps {
  logCount: number;
  avgRating?: number;
  interestedCount: number;
}

export function EventStats({ logCount, avgRating, interestedCount }: EventStatsProps) {
  return (
    <View style={styles.container}>
      <StatPill value={logCount} label="ATTENDED" style={styles.pill} />
      {typeof avgRating === 'number' ? (
        <StatPill value={avgRating.toFixed(1)} label="AVG RATING" style={styles.pill} />
      ) : null}
      <StatPill value={interestedCount} label="INTERESTED" style={styles.pill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  pill: {
    flex: 1,
    borderRadius: radius.md,
  },
});
