import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, radius, spacing } from '../../lib/theme';

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
          <Ionicons name={leftIcon as any} size={20} color={colors.textMuted} style={styles.leftIcon} />
        ) : null}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brandCyan}
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
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon as any} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {resolvedError ? <Text style={styles.error}>{resolvedError}</Text> : null}
    </View>
  );
}

export default Input;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fonts.bodySmall,
    fontWeight: fonts.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  inputFocused: {
    borderColor: colors.brandPurple,
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: fonts.body,
    color: colors.textPrimary,
  },
  error: {
    fontSize: fonts.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});




