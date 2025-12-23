import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { UserBadge } from '../../types/profile';

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
                <Ionicons name="ribbon-outline" size={18} color="#8B5CF6" />
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
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    padding: 12,
  },
  title: {
    color: '#FFFFFF',
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
    backgroundColor: '#0A0B1E',
    borderWidth: 1,
    borderColor: '#2D2D4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    color: '#A0A0B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});




