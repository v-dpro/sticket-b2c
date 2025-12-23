import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Badge, BadgeProgress, UserBadge } from '../../types/badge';
import { colors, spacing } from '../../lib/theme';
import { BadgeGrid } from './BadgeGrid';

export function BadgeCategory({
  title,
  badges,
  earnedBadges,
  progress,
  onBadgePress,
}: {
  title: string;
  badges: Badge[];
  earnedBadges: UserBadge[];
  progress: BadgeProgress[];
  onBadgePress?: (badge: Badge) => void;
}) {
  if (!badges?.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <BadgeGrid badges={badges} earnedBadges={earnedBadges} progress={progress} onBadgePress={onBadgePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 14,
  },
});



