import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { PillButton } from '../../components/ui/PillButton';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
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
  const { tokens } = useTheme();
  const { earnedBadges, progress, badgesByCategory, loading, error, totalPoints, earnedCount, totalCount, refresh } = useBadges();

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: 12,
      paddingBottom: 12,
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    title: { color: t.colors.fg, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
    muted: { color: t.colors.mute },
    scrollContent: { paddingHorizontal: t.density.pad, paddingBottom: 24 },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingVertical: 18,
      marginBottom: t.spacing.lg,
    },
    stat: { alignItems: 'center', minWidth: 90 },
    statValue: { fontFamily: t.fontFamilies.monoBold, fontSize: 22, fontWeight: '700', color: t.colors.fg },
    statLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: t.colors.muteSoft,
      marginTop: 6,
    },
    divider: { width: 1, height: 40, backgroundColor: t.colors.line },
  }));

  const onBadgePress = (badge: Badge) => {
    router.push({ pathname: '/badges/[id]', params: { id: badge.id } });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Badges</Text>
        <SpringPressable onPress={() => void refresh()} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="refresh" size={20} color={tokens.colors.mute} />
        </SpringPressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.colors.mute} />
          <Text style={styles.muted}>{'Loading badges…'}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.muted, { textAlign: 'center' }]}>{error}</Text>
          <PillButton title="Retry" variant="secondary" onPress={() => void refresh()} springFeedback haptic="light" />
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
                <Ionicons name="star" size={16} color={tokens.colors.muteSoft} />
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
    </SafeAreaView>
  );
}
