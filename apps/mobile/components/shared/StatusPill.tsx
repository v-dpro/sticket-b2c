import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

export type StatusType = 'ticket' | 'presale' | 'upcoming' | 'tracking';

interface StatusPillProps {
  type: StatusType;
  label: string;
}

const config = {
  ticket: {
    bg: 'rgba(0, 212, 255, 0.15)',
    color: colors.brandCyan,
    icon: 'ticket-outline' as const,
  },
  presale: {
    bg: 'rgba(139, 92, 246, 0.15)',
    color: colors.brandPurple,
    icon: 'notifications-outline' as const,
  },
  upcoming: {
    bg: colors.surfaceElevated,
    color: colors.textSecondary,
    icon: 'calendar-outline' as const,
  },
  tracking: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: colors.warning,
    icon: 'eye-outline' as const,
  },
};

export function StatusPill({ type, label }: StatusPillProps) {
  const { bg, color, icon } = config[type];

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


