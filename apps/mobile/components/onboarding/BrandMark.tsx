// BrandMark — the reserved brand gradient, used ONLY here (the brand mark).
// A rounded gradient tile with the Sticket logo, per the "Encore, muted" rules.

import React from 'react';
import { Image, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../lib/theme-context';

export function BrandMark({ size = 76, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  return (
    <LinearGradient
      colors={tokens.gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: tokens.radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tokens.shadows.elevated,
        style,
      ]}
    >
      <Image
        source={require('../../assets/brand-logo.png')}
        style={{ width: size * 0.56, height: size * 0.56 }}
        resizeMode="contain"
        accessibilityLabel="Sticket"
      />
    </LinearGradient>
  );
}
