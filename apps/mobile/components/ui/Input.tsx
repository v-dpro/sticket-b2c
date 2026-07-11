import React, { useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fonts, radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export interface InputProps extends TextInputProps {
  label?: string;
  /**
   * Figma prompt API.
   */
  error?: string;
  /**
   * Backwards-compatible alias used in parts of the codebase.
   */
  errorText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  errorText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fonts.bodySmall,
      fontWeight: fonts.medium,
      color: t.colors.textHi,
      marginBottom: spacing.sm,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: spacing.lg,
    },
    inputFocused: {
      borderColor: t.colors.brandCyan,
      shadowColor: t.colors.brandCyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    inputError: {
      borderColor: t.colors.error,
    },
    leftIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      height: 48,
      fontSize: fonts.body,
      color: t.colors.textHi,
    },
    error: {
      fontSize: fonts.caption,
      color: t.colors.error,
      marginTop: spacing.xs,
    },
  }));

  const isPassword = !!secureTextEntry;
  const actualSecure = isPassword && !showPassword;
  const resolvedError = error ?? errorText;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          resolvedError && styles.inputError,
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon as any} size={20} color={tokens.colors.textMuted} style={styles.leftIcon} />
        ) : null}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={tokens.colors.textMuted}
          selectionColor={tokens.colors.brandCyan}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={actualSecure}
          {...props}
        />

        {isPassword ? (
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={tokens.colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon as any} size={20} color={tokens.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {resolvedError ? <Text style={styles.error}>{resolvedError}</Text> : null}
    </View>
  );
}

export default Input;
