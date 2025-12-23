import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { BadgeProgress as BadgeProgressType } from '../../types/badge';
import { colors } from '../../lib/theme';
import { RARITY_COLORS } from './BadgeIcon';

export function BadgeProgress({ progress }: { progress: BadgeProgressType }) {
  const c = RARITY_COLORS[progress.badge.rarity];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Progress</Text>
        <Text style={styles.value}>
          {progress.current}/{progress.target}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress.percentage}%`, backgroundColor: c }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});



