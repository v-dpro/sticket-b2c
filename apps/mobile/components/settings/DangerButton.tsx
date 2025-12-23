import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius } from '../../lib/theme';

type DangerButtonProps = {
  icon?: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
  isDestructive?: boolean;
};

export function DangerButton({ icon, label, onPress, loading = false, isDestructive = false }: DangerButtonProps) {
  return (
    <Pressable
      style={[styles.container, isDestructive && styles.destructive]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDestructive ? colors.error : colors.textPrimary} />
      ) : (
        <>
          {icon ? <Ionicons name={icon as any} size={18} color={isDestructive ? colors.error : colors.textPrimary} /> : null}
          <Text style={[styles.label, isDestructive && styles.labelDestructive]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  labelDestructive: {
    color: colors.error,
  },
});



