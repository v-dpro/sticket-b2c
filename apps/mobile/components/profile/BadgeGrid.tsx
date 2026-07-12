import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { UserBadge } from '../../types/profile';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface BadgeGridProps {
  badges: UserBadge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: t.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: 12,
    },
    title: {
      color: t.colors.textHi,
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
      backgroundColor: t.colors.ink,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeName: {
      color: t.colors.textMid,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
  }));

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
                <Ionicons name="ribbon-outline" size={18} color={tokens.colors.brandPurple} />
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
