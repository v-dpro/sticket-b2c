import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { TicketStatus } from '../../types/ticket';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  KEEPING: { label: 'Keeping', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)' },
  SELLING: { label: 'For Sale', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  SOLD: { label: 'Sold', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  TRANSFERRED: { label: 'Transferred', color: '#6B6B8D', bg: 'rgba(107, 107, 141, 0.1)' },
};

export function TicketStatusBadge({ status, size = 'small' }: TicketStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === 'medium' && styles.medium]}>
      <Text style={[styles.text, { color: config.color }, size === 'medium' && styles.mediumText]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  mediumText: {
    fontSize: 12,
  },
});



