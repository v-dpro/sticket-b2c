import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Badge, BadgeProgress, UserBadge } from '../../types/badge';
import { BadgeCard } from './BadgeCard';

interface BadgeGridProps {
  badges: Badge[];
  earnedBadges: UserBadge[];
  progress: BadgeProgress[];
  onBadgePress?: (badge: Badge) => void;
}

export function BadgeGrid({ badges, earnedBadges, progress, onBadgePress }: BadgeGridProps) {
  const earnedMap = new Map(earnedBadges.map((b) => [b.badge.id, b] as const));
  const progressMap = new Map(progress.map((p) => [p.badge.id, p] as const));

  return (
    <View style={styles.grid}>
      {badges.map((badge) => {
        const earned = earnedMap.get(badge.id);
        const prog = progressMap.get(badge.id);

        return (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={Boolean(earned)}
            earnedAt={earned?.earnedAt}
            progress={prog}
            onPress={() => onBadgePress?.(badge)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
});



