import React, { type ReactNode } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  View,
} from 'react-native';
import { colors } from '../../lib/theme';
import { SpringPressable } from './SpringPressable';

type PillButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost' | 'accentGhost' | 'mono';
  size?: 'sm' | 'md' | 'lg';
  accentColor?: string;
  disabled?: boolean;
  icon?: ReactNode;
  /**
   * Opt-in spec tap feedback (INTERACTIONS.md): 80ms scale-down,
   * spring-back release, shake on disabled tap. Default false so
   * existing screens keep the plain pressed-state behavior.
   */
  springFeedback?: boolean;
  /** Haptic on press when springFeedback is on. Default 'none'. */
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
};

const HEIGHT: Record<string, number> = { sm: 30, md: 38, lg: 46 };
const FONT_SIZE: Record<string, number> = { sm: 12, md: 14, lg: 15 };
const PADDING_H: Record<string, number> = { sm: 14, md: 18, lg: 24 };

export function PillButton({
  title,
  onPress,
  variant = 'solid',
  size = 'md',
  accentColor = colors.brandCyan,
  disabled = false,
  icon,
  springFeedback = false,
  haptic = 'none',
}: PillButtonProps) {
  const h = HEIGHT[size];
  const fontSize = FONT_SIZE[size];
  const px = PADDING_H[size];

  const containerStyle: ViewStyle[] = [
    styles.base,
    { height: h, paddingHorizontal: px, borderRadius: 999 },
  ];

  const textStyle: TextStyle[] = [{ fontSize, fontWeight: '600' }];

  switch (variant) {
    case 'solid':
      containerStyle.push({ backgroundColor: accentColor });
      textStyle.push({ color: colors.ink });
      break;
    case 'ghost':
      containerStyle.push({
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.hairline,
      });
      textStyle.push({ color: colors.textHi });
      break;
    case 'accentGhost': {
      // Derive soft bg and line from accent color
      const softBg = accentColor + '1F'; // ~12% opacity
      const lineBorder = accentColor + '59'; // ~35% opacity
      containerStyle.push({
        backgroundColor: softBg,
        borderWidth: 1,
        borderColor: lineBorder,
      });
      textStyle.push({ color: accentColor });
      break;
    }
    case 'mono':
      containerStyle.push({ backgroundColor: colors.surface });
      textStyle.push({
        color: colors.textHi,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      });
      break;
  }

  if (disabled) {
    containerStyle.push({ opacity: 0.4 });
  }

  const content = (
    <>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={textStyle}>{title}</Text>
    </>
  );

  if (springFeedback) {
    return (
      <SpringPressable
        onPress={onPress}
        disabled={disabled}
        haptic={haptic}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {content}
      </SpringPressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
});
