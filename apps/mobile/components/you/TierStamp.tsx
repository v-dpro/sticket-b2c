// TierStamp — a small ticket-style tier badge. Ink-only: lower tiers are
// an outlined stamp, elite tiers invert to a solid ink chip. Used for city
// medals (BRONZE→PLATINUM) and artist superfan tiers (FAN→DEVOTEE).

import React from 'react';
import { Text, View } from 'react-native';

import type { Tier } from '../../lib/gamification';
import { useThemedStyles } from '../../lib/theme-context';

export function TierStamp({ tier }: { tier: Tier }) {
  const styles = useThemedStyles((t) => ({
    base: {
      borderRadius: t.radius.chip,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1.5,
    },
    outlined: { borderColor: t.colors.fg, backgroundColor: 'transparent' },
    filled: { borderColor: t.colors.fg, backgroundColor: t.colors.inverseBg },
    text: {
      fontFamily: t.fontFamilies.monoBold,
      fontSize: 9.5,
      letterSpacing: 1,
      color: t.colors.fg,
    },
    textFilled: { color: t.colors.inverseFg },
  }));

  if (!tier) return null;
  return (
    <View style={[styles.base, tier.filled ? styles.filled : styles.outlined]}>
      <Text style={[styles.text, tier.filled ? styles.textFilled : null]}>{tier.label}</Text>
    </View>
  );
}
