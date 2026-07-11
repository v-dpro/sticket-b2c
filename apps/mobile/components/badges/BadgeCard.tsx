import React from 'react';
import { Text, View } from 'react-native';

import type { Badge, BadgeProgress } from '../../types/badge';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { BadgeIcon, getRarityColor } from './BadgeIcon';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: string;
  progress?: BadgeProgress;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function BadgeCard({ badge, earned, progress, onPress, size = 'medium' }: BadgeCardProps) {
  const { tokens } = useTheme();
  const iconSize = size === 'small' ? 56 : size === 'large' ? 96 : 72;
  const rarityColor = getRarityColor(tokens.colors, badge.rarity);

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
    progressFill: { height: '100%' },
    name: { fontSize: 12, fontWeight: '700', color: t.colors.fg, textAlign: 'center' },
    nameUnearned: { color: t.colors.mute },
    rarityPill: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    rarityText: { fontFamily: t.fontFamilies.mono, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    progressText: { fontFamily: t.fontFamilies.mono, fontSize: 11, color: t.colors.muteSoft, marginTop: 6 },
  }));

  return (
    <SpringPressable style={styles.container} onPress={onPress} haptic="light" accessibilityRole="button">
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
    </SpringPressable>
  );
}
