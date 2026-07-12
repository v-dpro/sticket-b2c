import React from 'react';
import { Text, View } from 'react-native';

import type { Badge, BadgeProgress } from '../../types/badge';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { BadgeIcon, getMilestoneCount } from './BadgeIcon';

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

  const styles = useThemedStyles((t) => ({
    container: { alignItems: 'center', width: 96 },
    iconWrap: { position: 'relative', marginBottom: 8 },
    progressStrip: {
      position: 'absolute',
      left: 6,
      right: 6,
      bottom: 8,
      height: 5,
      borderRadius: 999,
      backgroundColor: t.colors.card2,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: t.colors.fg },
    name: { fontSize: 12, fontWeight: '700', color: t.colors.fg, textAlign: 'center' },
    nameUnearned: { color: t.colors.mute },
    rarityText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: t.colors.muteSoft,
      marginTop: 6,
    },
    progressText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: t.colors.muteSoft,
      marginTop: 6,
    },
  }));

  return (
    <SpringPressable style={styles.container} onPress={onPress} haptic="light" accessibilityRole="button">
      <View style={styles.iconWrap}>
        <BadgeIcon
          icon={badge.icon}
          earned={earned}
          rarity={badge.rarity}
          count={getMilestoneCount(badge.criteria)}
          size={iconSize}
        />
        {!earned && progress ? (
          <View style={styles.progressStrip}>
            <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.name, !earned && styles.nameUnearned]} numberOfLines={2}>
        {badge.name}
      </Text>

      {earned ? (
        <Text style={styles.rarityText}>{badge.rarity}</Text>
      ) : progress ? (
        <Text style={styles.progressText}>
          {progress.current}/{progress.target}
        </Text>
      ) : (
        <Text style={styles.progressText}>Locked</Text>
      )}
    </SpringPressable>
  );
}
