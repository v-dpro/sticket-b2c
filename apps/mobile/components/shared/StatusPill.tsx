import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

export type StatusType = 'ticket' | 'presale' | 'upcoming' | 'tracking';

interface StatusPillProps {
  type: StatusType;
  label: string;
}

const makeConfig = (colors: ThemeColors) => ({
  ticket: {
    bg: 'rgba(0, 212, 255, 0.15)',
    color: colors.fg,
    icon: 'ticket-outline' as const,
  },
  presale: {
    bg: 'rgba(139, 92, 246, 0.15)',
    color: colors.fg,
    icon: 'notifications-outline' as const,
  },
  upcoming: {
    bg: colors.elevated,
    color: colors.textMid,
    icon: 'calendar-outline' as const,
  },
  tracking: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: colors.warning,
    icon: 'eye-outline' as const,
  },
});

export function StatusPill({ type, label }: StatusPillProps) {
  const { tokens } = useTheme();
  const { bg, color, icon } = makeConfig(tokens.colors)[type];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
