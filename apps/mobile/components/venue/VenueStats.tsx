import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../lib/theme';
import { StatPill } from '../ui/StatPill';

interface VenueStatsProps {
  totalShows: number;
  totalLogs: number;
  capacity?: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function VenueStats({ totalShows, totalLogs, capacity }: VenueStatsProps) {
  return (
    <View style={styles.container}>
      <StatPill value={formatNumber(totalShows)} label="YOUR VISITS" style={styles.pill} />
      <StatPill value={formatNumber(totalLogs)} label="AVG RATING" style={styles.pill} />
      {typeof capacity === 'number' ? (
        <StatPill value={formatNumber(capacity)} label="CAPACITY" style={styles.pill} />
      ) : null}
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
