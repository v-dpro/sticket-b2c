import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { colors } from '../../lib/theme';

type MonoLabelProps = {
  children: string;
  size?: number;
  color?: string;
  style?: TextStyle;
};

export function MonoLabel({
  children,
  size = 11,
  color = colors.textLo,
  style,
}: MonoLabelProps) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          fontWeight: '500',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
