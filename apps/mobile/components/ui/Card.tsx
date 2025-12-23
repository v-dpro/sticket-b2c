import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shadows } from '../../lib/theme';

type CardProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
};

export function Card({ children, style, onPress, elevated = false }: CardProps) {
  const cardStyles = [styles.card, elevated && shadows.elevated, style];

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [cardStyles, pressed && styles.pressed]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16, // rounded-2xl
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16, // p-4
  },
  pressed: {
    opacity: 0.9,
  },
});



