import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type DangerButtonProps = {
  icon?: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
  isDestructive?: boolean;
};

export function DangerButton({ icon, label, onPress, loading = false, isDestructive = false }: DangerButtonProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingVertical: 14,
      marginHorizontal: t.density.pad,
      gap: 8,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    destructive: {
      backgroundColor: t.isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(220, 38, 38, 0.08)',
      borderColor: t.isDark ? 'rgba(239, 68, 68, 0.30)' : 'rgba(220, 38, 38, 0.28)',
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: t.colors.fg,
    },
    labelDestructive: {
      color: t.colors.error,
    },
  }));

  const tint = isDestructive ? tokens.colors.error : tokens.colors.fg;

  return (
    <SpringPressable
      style={[styles.container, isDestructive && styles.destructive]}
      onPress={onPress}
      disabled={loading}
      haptic="light"
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <>
          {icon ? <Ionicons name={icon as any} size={18} color={tint} /> : null}
          <Text style={[styles.label, isDestructive && styles.labelDestructive]}>{label}</Text>
        </>
      )}
    </SpringPressable>
  );
}
