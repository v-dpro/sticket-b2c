import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients, radius, spacing } from '../../lib/theme';

type NewButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type LegacyButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type NewButtonProps = {
  title: string;
  onPress: () => void;
  variant?: NewButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
};

type LegacyButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: LegacyButtonVariant;
  left?: ReactNode;
  // Allow new props too (some callsites may start mixing)
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export type ButtonProps = NewButtonProps | LegacyButtonProps;

const legacyToNewVariant = (v: LegacyButtonVariant | NewButtonVariant): NewButtonVariant => {
  if (v === 'danger') return 'destructive';
  return v;
};

const variantStyles: Record<
  NewButtonVariant,
  { bg: string; border?: string; text: string; useGradient?: boolean; spinner: string }
> = {
  primary: { bg: colors.primary, text: colors.textPrimary, useGradient: true, spinner: colors.textPrimary },
  secondary: { bg: 'transparent', border: colors.brandPurple, text: colors.brandPurple, spinner: colors.brandPurple },
  ghost: { bg: 'transparent', text: colors.textPrimary, spinner: colors.brandPurple },
  destructive: { bg: colors.error, text: colors.textPrimary, spinner: colors.textPrimary },
};

const sizeStyles: Record<ButtonSize, { height?: number; paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { height: 40, paddingV: spacing.sm, paddingH: spacing.md, fontSize: fonts.bodySmall },
  md: { height: 56, paddingV: spacing.md, paddingH: spacing.lg, fontSize: fonts.body },
  lg: { height: 60, paddingV: spacing.lg, paddingH: spacing.xl, fontSize: fonts.h4 },
};

export function Button(props: ButtonProps) {
  const title = 'title' in props ? props.title : props.label;
  const icon = 'title' in props ? props.icon : props.left;
  const onPress = props.onPress;
  const disabled = props.disabled ?? false;
  const loading = props.loading ?? false;
  const size = props.size ?? 'md';
  const fullWidth = props.fullWidth ?? false;
  const style = props.style;

  const variant = legacyToNewVariant((props as any).variant ?? 'primary');
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        {
          height: s.height,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          borderRadius: radius.md,
          backgroundColor: v.useGradient ? 'transparent' : v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: disabled || loading ? 0.5 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {v.useGradient ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <ActivityIndicator color={v.spinner} />
        ) : (
          <>
            {icon}
            <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: fonts.semibold }}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
});



