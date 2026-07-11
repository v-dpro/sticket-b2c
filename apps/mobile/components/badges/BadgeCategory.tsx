import React from 'react';
import { Text, View } from 'react-native';

import type { Badge, BadgeProgress, UserBadge } from '../../types/badge';
import { useThemedStyles } from '../../lib/theme-context';
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
  const styles = useThemedStyles((t) => ({
    section: { marginBottom: t.spacing.xl },
    title: { fontSize: 16, fontWeight: '800', color: t.colors.fg, marginBottom: 14, letterSpacing: -0.3 },
  }));

  if (!badges?.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <BadgeGrid badges={badges} earnedBadges={earnedBadges} progress={progress} onBadgePress={onBadgePress} />
    </View>
  );
}
