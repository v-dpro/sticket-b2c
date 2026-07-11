import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { BadgeRarity } from '../../types/badge';
import { useTheme } from '../../lib/theme-context';

type RarityPalette = {
  mute: string;
  success: string;
  brandBlue: string;
  accent: string;
  warning: string;
};

/** Semantic rarity hue, resolved from the active theme palette. */
export function getRarityColor(c: RarityPalette, rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common':
      return c.mute;
    case 'uncommon':
      return c.success;
    case 'rare':
      return c.brandBlue;
    case 'epic':
      return c.accent;
    case 'legendary':
      return c.warning;
    default:
      return c.mute;
  }
}

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
  const { tokens } = useTheme();
  const c = getRarityColor(tokens.colors, rarity);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: earned ? c : tokens.colors.hairline,
          backgroundColor: earned ? `${c}20` : tokens.colors.card2,
        },
      ]}
    >
      <Ionicons name={icon as any} size={Math.round(size * 0.45)} color={earned ? c : tokens.colors.muteSoft} />
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
