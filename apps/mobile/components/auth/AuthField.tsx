// AuthField — the redesign's text input for auth flows.
// card2 fill, no border at rest, hairline accent ring on focus,
// error ring + message, optional password reveal. Fully token-driven.

import React, { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

export type AuthFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthField({
  label,
  error,
  secureTextEntry,
  onFocus,
  onBlur,
  style,
  ...props
}: AuthFieldProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = Boolean(secureTextEntry);

  const styles = useThemedStyles((t) => ({
    wrap: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: t.colors.textSoft },
    field: {
      height: 52,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    fieldFocused: { borderColor: t.colors.accentLine },
    fieldError: { borderColor: t.colors.error },
    input: {
      flex: 1,
      fontSize: 16,
      color: t.colors.text,
      paddingVertical: 0,
    },
    error: { fontSize: 12, color: t.colors.error },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        <TextInput
          placeholderTextColor={tokens.colors.muteSoft}
          selectionColor={tokens.colors.accent}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={tokens.colors.mute}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
