import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { useBadges } from '../../hooks/useBadges';
import type { Badge, BadgeCategory } from '../../types/badge';
import { BadgeCategory as BadgeCategorySection } from '../../components/badges/BadgeCategory';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  milestone: 'Milestones',
  streak: 'Streaks',
  loyalty: 'Loyalty',
  explorer: 'Explorer',
  traveler: 'Traveler',
  genre: 'Genres',
  venue: 'Venue Regular',
  special: 'Special',
};

const CATEGORY_ORDER: BadgeCategory[] = ['milestone', 'streak', 'loyalty', 'explorer', 'traveler', 'genre', 'venue', 'special'];

export default function BadgesScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { earnedBadges, progress, badgesByCategory, loading, error, totalPoints, earnedCount, totalCount, refresh } = useBadges();

  const onBadgePress = (badge: Badge) => {
    router.push({ pathname: '/badges/[id]', params: { id: badge.id } });
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Badges</Text>
        <Pressable onPress={() => void refresh()} style={styles.backButton}>
          <Ionicons name="refresh" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
          <Text style={styles.muted}>{'Loading badges…'}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.muted, { textAlign: 'center' }]}>{error}</Text>
          <Pressable onPress={() => void refresh()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{earnedCount}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Math.max(0, totalCount - earnedCount)}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.statValue}>{totalPoints}</Text>
              </View>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>

          {CATEGORY_ORDER.map((category) => {
            const badges = badgesByCategory[category];
            if (!badges?.length) return null;

            return (
              <BadgeCategorySection
                key={category}
                title={CATEGORY_LABELS[category]}
                badges={badges}
                earnedBadges={earnedBadges}
                progress={progress}
                onBadgePress={onBadgePress}
              />
            );
          })}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  muted: {
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryText: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    marginBottom: spacing.lg,
  },
  stat: {
    alignItems: 'center',
    minWidth: 90,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});



