import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

interface ArtistStatsProps {
  followerCount: number;
  totalLogs: number;
  avgRating?: number;
}

export function ArtistStats({ followerCount, totalLogs, avgRating }: ArtistStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Ionicons name="people" size={20} color={colors.brandPurple} />
        <Text style={styles.statValue}>{formatNumber(followerCount)}</Text>
        <Text style={styles.statLabel}>followers</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Ionicons name="musical-notes" size={20} color={colors.brandCyan} />
        <Text style={styles.statValue}>{formatNumber(totalLogs)}</Text>
        <Text style={styles.statLabel}>times logged</Text>
      </View>

      {avgRating !== undefined && avgRating !== null ? (
        <>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});



