import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { levelFor } from '../../lib/game';

type XpBarProps = {
  xp: number;
  showLabel?: boolean;
};

export function XpBar({ xp, showLabel = false }: XpBarProps) {
  const level = levelFor(xp);

  return (
    <View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: level.color,
              width: `${Math.min(level.progress * 100, 100)}%`,
            },
          ]}
        />
      </View>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: level.color }]}>
            {level.name}
          </Text>
          <Text style={styles.xpCount}>{xp.toLocaleString()} XP</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 999,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  xpCount: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: colors.textLo,
    textTransform: 'uppercase',
  },
});
