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

/** "JUL 2026" — the earn-date stamp under an earned badge (mono, uppercased). */
function formatEarned(iso?: string): string {
  if (!iso) return 'EARNED';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'EARNED';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
}

export function BadgeCard({ badge, earned, earnedAt, progress, onPress, size = 'medium' }: BadgeCardProps) {
  const iconSize = size === 'small' ? 56 : size === 'large' ? 96 : 72;

  const styles = useThemedStyles((t) => ({
    container: { alignItems: 'center', width: 96 },
    iconWrap: { marginBottom: 8 },
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
      </View>

      <Text style={[styles.name, !earned && styles.nameUnearned]} numberOfLines={2}>
        {badge.name}
      </Text>

      {/* Earned = earn-date stamp; locked = exact distance (C11 — no rings). */}
      {earned ? (
        <Text style={styles.rarityText}>{formatEarned(earnedAt)}</Text>
      ) : progress ? (
        <Text style={styles.progressText}>
          {Math.max(0, progress.target - progress.current)} TO GO
        </Text>
      ) : (
        <Text style={styles.progressText}>Locked</Text>
      )}
    </SpringPressable>
  );
}
