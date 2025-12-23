import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Badge, BadgeProgress } from '../../types/badge';
import { colors } from '../../lib/theme';
import { BadgeIcon, RARITY_COLORS } from './BadgeIcon';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: string;
  progress?: BadgeProgress;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function BadgeCard({ badge, earned, progress, onPress, size = 'medium' }: BadgeCardProps) {
  const iconSize = size === 'small' ? 56 : size === 'large' ? 96 : 72;
  const rarityColor = RARITY_COLORS[badge.rarity];

  return (
    <Pressable style={({ pressed }) => [styles.container, { opacity: pressed ? 0.9 : 1 }]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <BadgeIcon icon={badge.icon} earned={earned} rarity={badge.rarity} size={iconSize} />
        {!earned && progress ? (
          <View style={styles.progressStrip}>
            <View style={[styles.progressFill, { width: `${progress.percentage}%`, backgroundColor: rarityColor }]} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.name, !earned && styles.nameUnearned]} numberOfLines={2}>
        {badge.name}
      </Text>

      {earned ? (
        <View style={[styles.rarityPill, { backgroundColor: `${rarityColor}20` }]}>
          <Text style={[styles.rarityText, { color: rarityColor }]}>{badge.rarity}</Text>
        </View>
      ) : progress ? (
        <Text style={styles.progressText}>
          {progress.current}/{progress.target}
        </Text>
      ) : (
        <Text style={styles.progressText}>Locked</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 96,
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  progressStrip: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  nameUnearned: {
    color: colors.textSecondary,
  },
  rarityPill: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  progressText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 6,
  },
});



