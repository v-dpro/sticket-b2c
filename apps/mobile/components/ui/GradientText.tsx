import type { ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients as themeGradients } from '../../lib/theme';

type GradientTextProps = {
  children: ReactNode;
  style?: TextStyle;
  colors?: readonly string[];
};

export function GradientText({ children, style, colors }: GradientTextProps) {
  const gradientColors = (colors ?? themeGradients.rainbow) as [string, string, ...string[]];

  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>
      }
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
