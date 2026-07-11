import React, { useEffect, useRef } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  showCancel?: boolean;
  rightAccessory?: React.ReactNode;
}

export function SearchInput({
  value,
  onChangeText,
  onClear,
  onCancel,
  placeholder = 'Search artists, venues, events…',
  autoFocus = true,
  showCancel = false,
  rightAccessory,
}: SearchInputProps) {
  // RN 0.81 TextInput ref typing is currently awkward across versions; keep it permissive.
  const inputRef = useRef<any>(null);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    inputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.inkAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm + 4,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      height: 44,
      color: t.colors.textHi,
      fontSize: 16,
    },
    clearButton: {
      padding: 4,
    },
    cancelButton: {
      marginLeft: spacing.xs,
      padding: 6,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
  }));

  useEffect(() => {
    if (!autoFocus) return;
    const id = setTimeout(() => inputRef.current?.focus?.(), 100);
    return () => clearTimeout(id);
  }, [autoFocus]);

  const handleCancel = () => {
    Keyboard.dismiss();
    onClear();
    onCancel?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={20} color={tokens.colors.textLo} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={tokens.colors.textLo}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <Pressable onPress={onClear} style={styles.clearButton} hitSlop={8} accessibilityRole="button">
            <Ionicons name="close-circle" size={18} color={tokens.colors.textLo} />
          </Pressable>
        )}
      </View>

      {showCancel && (
        <View style={styles.actions}>
          {rightAccessory}
          <Pressable onPress={handleCancel} style={styles.cancelButton} hitSlop={8} accessibilityRole="button">
            <Ionicons name="close" size={22} color={tokens.colors.textMid} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
