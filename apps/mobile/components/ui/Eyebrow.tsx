import React from 'react';
import { Text, type ViewStyle } from 'react-native';
import { colors } from '../../lib/theme';

type EyebrowProps = {
  text: string;
  color?: string;
  style?: ViewStyle;
};

export function Eyebrow({ text, color = colors.textLo, style }: EyebrowProps) {
  return (
    <Text
      style={[
        {
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color,
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
}
