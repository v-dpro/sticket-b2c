import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { BadgeCriteria, BadgeRarity } from '../../types/badge';
import { radius } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

type RarityPalette = {
  mute: string;
  success: string;
  brandBlue: string;
  accent: string;
  warning: string;
};

/** Semantic rarity hue — SANCTIONED only for the EarnedBadgeModal
 *  celebration (C10). Tiles stay mono ink. */
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

/** Numeric milestones ("50 Shows") lead with the giant number. */
export function getMilestoneCount(criteria: BadgeCriteria): number | undefined {
  return 'count' in criteria ? criteria.count : undefined;
}

// The badge mark is a STAMP (C10): earned = 2px ink border with the
// stamp's resting −3° tilt; locked = dashed `dash` border at mute.
// No rarity fills on tiles — rarity survives only as a mono word.
export function BadgeIcon({
  icon,
  earned,
  count,
  size,
}: {
  icon: string;
  earned: boolean;
  rarity: BadgeRarity;
  /** Leading number for numeric milestones — replaces the glyph. */
  count?: number;
  size: number;
}) {
  const { tokens } = useTheme();
  const ink = earned ? tokens.colors.fg : tokens.colors.mute;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size >= 96 ? radius.stub : radius.chip,
          borderColor: earned ? tokens.colors.fg : tokens.colors.dash,
          borderStyle: earned ? 'solid' : 'dashed',
          transform: earned ? [{ rotate: '-3deg' }] : undefined,
        },
      ]}
    >
      {count !== undefined ? (
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontVariant: ['tabular-nums'],
            fontSize: Math.round(size * 0.4),
            fontWeight: '700',
            letterSpacing: -0.5,
            color: ink,
          }}
        >
          {count}
        </Text>
      ) : (
        <Ionicons name={icon as any} size={Math.round(size * 0.45)} color={ink} />
      )}
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
