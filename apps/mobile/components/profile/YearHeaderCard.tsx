import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

export type YearHeaderCardData = {
  year: number;
  showCount: number;
  artistCount: number;
  venueCount: number;
  isTopYear: boolean;
  progress: number; // 0..1
};

interface YearHeaderCardProps {
  data: YearHeaderCardData;
}

export function YearHeaderCard({ data }: YearHeaderCardProps) {
  const pct = useMemo(() => Math.max(0, Math.min(1, data.progress || 0)), [data.progress]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.year}>{data.year}</Text>
        {data.isTopYear ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>Top year</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.showCount}</Text>
          <Text style={styles.statLabel}>Shows</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.artistCount}</Text>
          <Text style={styles.statLabel}>Artists</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.venueCount}</Text>
          <Text style={styles.statLabel}>Venues</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  year: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.35)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandCyan,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.brandPurple,
  },
});



