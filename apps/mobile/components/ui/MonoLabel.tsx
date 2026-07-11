import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { fontFamilies } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

type MonoLabelProps = {
  children: string;
  size?: number;
  color?: string;
  style?: TextStyle;
};

export function MonoLabel({ children, size = 11, color, style }: MonoLabelProps) {
  const { tokens } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: fontFamilies.mono,
          fontSize: size,
          fontWeight: '500',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: color ?? tokens.colors.textLo,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
