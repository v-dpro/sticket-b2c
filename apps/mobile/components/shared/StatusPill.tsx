import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type StatusType = 'ticket' | 'presale' | 'upcoming' | 'tracking';

interface StatusPillProps {
  type: StatusType;
  label: string;
}

const config = {
  ticket: {
    bg: 'rgba(0, 212, 255, 0.15)',
    color: '#00D4FF',
    icon: 'ticket-outline' as const,
  },
  presale: {
    bg: 'rgba(139, 92, 246, 0.15)',
    color: '#8B5CF6',
    icon: 'notifications-outline' as const,
  },
  upcoming: {
    bg: '#252542',
    color: '#A0A0B8',
    icon: 'calendar-outline' as const,
  },
  tracking: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B',
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


