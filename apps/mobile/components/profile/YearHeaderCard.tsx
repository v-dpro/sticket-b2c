import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, gradients } from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

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
        <View style={styles.yearHeaderLeft}>
          <Text style={styles.year}>{data.year}</Text>
          {data.isTopYear && (
            <View style={styles.topYearBadge}>
              <Text style={styles.topYearText}>🏆 Top Year</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.yearStats}>
        <Text style={styles.statValue}>{data.showCount}</Text> shows • <Text style={styles.statValue}>{data.artistCount}</Text> artists • <Text style={styles.statValue}>{data.venueCount}</Text> venues
      </Text>

      {data.isTopYear && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={gradients.rainbow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]}
            />
          </View>
          <Text style={styles.progressText}>Your biggest year!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    marginBottom: 8,
  },
  yearHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  year: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  topYearBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  topYearText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  yearStats: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statValue: {
    color: colors.brandCyan,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 12,
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
  },
  progressText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
});



