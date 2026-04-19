import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { UserBadge } from '../../types/profile';
import { colors } from '../../lib/theme';

interface BadgeGridProps {
  badges: UserBadge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (!badges?.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Badges</Text>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <View key={badge.id} style={styles.badgeCard}>
            {badge.iconUrl ? (
              <Image source={{ uri: badge.iconUrl }} style={styles.badgeIcon} />
            ) : (
              <View style={styles.badgeIconPlaceholder}>
                <Ionicons name="ribbon-outline" size={18} color={colors.brandPurple} />
              </View>
            )}
            <Text style={styles.badgeName} numberOfLines={1}>
              {badge.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 12,
  },
  title: {
    color: colors.textHi,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeCard: {
    width: 92,
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 12,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  badgeIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    color: colors.textMid,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});




