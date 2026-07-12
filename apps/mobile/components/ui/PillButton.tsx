// PillButton — the monochrome "Encore, muted" button system.
//
// Buttons are MONOCHROME by design mandate:
//   primary   → ink-on-bg inversion (white pill / near-black label in dark
//               mode; black pill / white label in light mode)
//   secondary → soft card2 pill with primary text
//   ghost     → transparent, hairline border, ink text
// NEVER gradient-filled or purple-filled (explicitly rejected direction).
//
// Legacy variants remain as compile-safe aliases:
//   'solid' → primary · 'mono' → secondary · 'accentGhost' → secondary
//   shell with accent-tinted label (accent = small usages only).

import React, { type ReactNode } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  View,
} from 'react-native';
import { haptics } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from './SpringPressable';

type PillButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  /** @deprecated use 'primary' */
  | 'solid'
  /** @deprecated use 'secondary' (accent fills are no longer allowed) */
  | 'accentGhost'
  /** @deprecated use 'secondary' */
  | 'mono';

type PillButtonProps = {
  title: string;
  onPress: () => void;
  variant?: PillButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Accent tint. Only affects the deprecated 'accentGhost' variant's label;
   * monochrome variants ignore it (no accent-filled buttons).
   */
  accentColor?: string;
  disabled?: boolean;
  icon?: ReactNode;
  /**
   * Opt-in spec tap feedback (INTERACTIONS.md): 80ms scale-down,
   * spring-back release, shake on disabled tap. Default false so
   * existing screens keep the plain pressed-state behavior.
   */
  springFeedback?: boolean;
  /**
   * Haptic on press (both spring and plain paths). Default 'light' —
   * every button tap ticks (app-wide interactivity default). Pass 'none'
   * to opt out, or a heavier tier for commit actions.
   */
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
};

const HEIGHT: Record<string, number> = { sm: 30, md: 38, lg: 46 };
const FONT_SIZE: Record<string, number> = { sm: 12, md: 14, lg: 15 };
const PADDING_H: Record<string, number> = { sm: 14, md: 18, lg: 24 };

function normalizeVariant(variant: PillButtonVariant): 'primary' | 'secondary' | 'ghost' | 'accentGhost' {
  switch (variant) {
    case 'solid':
      return 'primary';
    case 'mono':
      return 'secondary';
    default:
      return variant;
  }
}

export function PillButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  accentColor,
  disabled = false,
  icon,
  springFeedback = false,
  haptic = 'light',
}: PillButtonProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  const h = HEIGHT[size];
  const fontSize = FONT_SIZE[size];
  const px = PADDING_H[size];

  const containerStyle: ViewStyle[] = [
    styles.base,
    { height: h, paddingHorizontal: px, borderRadius: 999 },
  ];

  const textStyle: TextStyle[] = [{ fontSize, fontWeight: '600' }];

  switch (normalizeVariant(variant)) {
    case 'primary':
      // Ink inversion — the sole "loud" button. Monochrome, never accent.
      containerStyle.push({ backgroundColor: c.inverseBg });
      textStyle.push({ color: c.inverseFg });
      break;
    case 'secondary':
      containerStyle.push({ backgroundColor: c.card2 });
      textStyle.push({ color: c.text });
      break;
    case 'ghost':
      containerStyle.push({
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: c.line,
      });
      textStyle.push({ color: c.fg });
      break;
    case 'accentGhost':
      // Deprecated: secondary shell, accent-tinted label (small usage).
      containerStyle.push({ backgroundColor: c.card2 });
      textStyle.push({ color: accentColor ?? c.accent });
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
      onPress={() => {
        // Same tick as the spring path — buttons feel interactive app-wide.
        if (haptic !== 'none') haptics[haptic]();
        onPress();
      }}
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
