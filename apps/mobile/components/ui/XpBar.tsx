import React from 'react';
import { View, Text } from 'react-native';
import { useThemedStyles } from '../../lib/theme-context';
import { levelFor } from '../../lib/game';

type XpBarProps = {
  xp: number;
  showLabel?: boolean;
};

export function XpBar({ xp, showLabel = false }: XpBarProps) {
  const level = levelFor(xp);
  const styles = useThemedStyles((t) => ({
    track: {
      height: 8,
      backgroundColor: t.colors.surface,
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
      color: t.colors.textLo,
      textTransform: 'uppercase',
    },
  }));

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
