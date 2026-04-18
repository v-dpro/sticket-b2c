import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../lib/theme';

interface EventStatsProps {
  logCount: number;
  avgRating?: number;
  interestedCount: number;
}

export function EventStats({ logCount, avgRating, interestedCount }: EventStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Ionicons name="people" size={20} color={colors.brandPurple} />
        <Text style={styles.statValue}>{logCount}</Text>
        <Text style={styles.statLabel}>were there</Text>
      </View>

      {typeof avgRating === 'number' ? (
        <View style={styles.stat}>
          <Ionicons name="star" size={20} color={colors.warning} />
          <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>avg rating</Text>
        </View>
      ) : null}

      <View style={styles.stat}>
        <Ionicons name="heart" size={20} color={colors.error} />
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: -40,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
});



