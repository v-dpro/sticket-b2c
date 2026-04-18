import { memo } from 'react';
import { Image, Text, View, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '../../lib/theme';

type AvatarProps = {
  uri?: string | null;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  name?: string | null;
  /** Show gradient border (cyan→purple→pink) */
  gradientBorder?: boolean;
  style?: StyleProp<any>;
};

const SIZES: Record<Exclude<AvatarProps['size'], number | undefined>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  '2xl': 120,
};

const FONT_SIZES: Record<Exclude<AvatarProps['size'], number | undefined>, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 40,
};

export const Avatar = memo(function Avatar({ uri, size = 'md', name, gradientBorder, style }: AvatarProps) {
  const dimension = typeof size === 'number' ? size : SIZES[size];
  const fontSize = typeof size === 'number' ? Math.max(10, Math.round(size * 0.35)) : FONT_SIZES[size];
  const initial = (name?.trim()?.[0] ?? 'U').toUpperCase();
  const borderWidth = gradientBorder ? 2 : 0;

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={[
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors.surfaceElevated,
        },
        !gradientBorder && style,
      ]}
    />
  ) : (
    <View
      style={[
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: gradientBorder ? 0 : 1,
          borderColor: colors.border,
        },
        !gradientBorder && style,
      ]}
    >
      <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize }}>{initial}</Text>
    </View>
  );

  if (gradientBorder) {
    const outer = dimension + borderWidth * 2;
    return (
      <LinearGradient
        colors={gradients.rainbow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            padding: borderWidth,
          },
          style,
        ]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return inner;
});
