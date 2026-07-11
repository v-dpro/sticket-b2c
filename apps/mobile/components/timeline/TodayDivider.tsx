// TodayDivider — the thin brand-gradient line splitting FUTURE from PAST.
// This is one of the SANCTIONED uses of tokens.gradients.brand (brand mark,
// timeline "Today" divider, milestone flash — nothing else).

import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../lib/theme-context';

export function TodayDivider() {
  const { tokens } = useTheme();

  const line = (flip: boolean) => (
    <LinearGradient
      colors={tokens.gradients.brand}
      start={{ x: flip ? 1 : 0, y: 0.5 }}
      end={{ x: flip ? 0 : 1, y: 0.5 }}
      style={{ flex: 1, height: 2, borderRadius: 1 }}
    />
  );

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Today"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      {line(false)}
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 2,
          color: tokens.colors.mute,
        }}
      >
        TODAY
      </Text>
      {line(true)}
    </View>
  );
}
