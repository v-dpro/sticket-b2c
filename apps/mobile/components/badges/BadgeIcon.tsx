import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { BadgeRarity } from '../../types/badge';
import { colors } from '../../lib/theme';

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: colors.textTertiary,
  uncommon: colors.success,
  rare: colors.brandBlue,
  epic: colors.brandPurple,
  legendary: colors.warning,
};

export function BadgeIcon({
  icon,
  earned,
  rarity,
  size,
}: {
  icon: string;
  earned: boolean;
  rarity: BadgeRarity;
  size: number;
}) {
  const c = RARITY_COLORS[rarity];

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: earned ? c : colors.border,
          backgroundColor: earned ? `${c}20` : colors.backgroundAlt,
        },
      ]}
    >
      <Ionicons name={icon as any} size={Math.round(size * 0.45)} color={earned ? c : colors.textTertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
});



