import React from 'react';
import { Text, View } from 'react-native';

import type { TicketStatus } from '../../types/ticket';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  size?: 'small' | 'medium';
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  KEEPING: 'Keeping',
  SELLING: 'For Sale',
  SOLD: 'Sold',
  TRANSFERRED: 'Transferred',
};

export function TicketStatusBadge({ status, size = 'small' }: TicketStatusBadgeProps) {
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    badge: {
      backgroundColor: t.colors.card2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: t.radius.sm,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: t.radius.md,
    },
    text: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mediumText: {
      fontSize: 12,
    },
  }));

  const tone: Record<TicketStatus, string> = {
    KEEPING: tokens.colors.success,
    SELLING: tokens.colors.warning,
    SOLD: tokens.colors.accent,
    TRANSFERRED: tokens.colors.mute,
  };

  return (
    <View style={[styles.badge, size === 'medium' && styles.medium]}>
      <Text style={[styles.text, { color: tone[status] }, size === 'medium' && styles.mediumText]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
