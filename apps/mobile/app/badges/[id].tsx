import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { useBadges } from '../../hooks/useBadges';
import { BadgeIcon, RARITY_COLORS } from '../../components/badges/BadgeIcon';
import { BadgeProgress } from '../../components/badges/BadgeProgress';

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BadgeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { allBadges, earnedBadges, getProgress, loading, error } = useBadges();

  const badge = allBadges.find((b) => b.id === id);
  const earned = earnedBadges.find((b) => b.badge.id === id);
  const progress = badge ? getProgress(badge.id) : undefined;

  const rarityColor = badge ? RARITY_COLORS[badge.rarity] : colors.brandPurple;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Badge</Text>
        <View style={styles.iconButton} />
      </View>

      {loading && !badge ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error && !badge ? (
        <View style={styles.center}>
          <Text style={[styles.muted, { textAlign: 'center' }]}>{error}</Text>
        </View>
      ) : !badge ? (
        <View style={styles.center}>
          <Text style={[styles.muted, { textAlign: 'center' }]}>Badge not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <BadgeIcon icon={badge.icon} earned={Boolean(earned)} rarity={badge.rarity} size={120} />

            <Text style={[styles.title, { color: rarityColor }]}>{badge.name}</Text>
            <Text style={styles.description}>{badge.description}</Text>

            <View style={styles.metaRow}>
              <View style={[styles.pill, { backgroundColor: `${rarityColor}20`, borderColor: `${rarityColor}40` }]}>
                <Text style={[styles.pillText, { color: rarityColor }]}>{badge.rarity.toUpperCase()}</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={[styles.pillText, { color: colors.warning }]}>+{badge.points} pts</Text>
              </View>
            </View>

            {earned ? <Text style={styles.earnedAt}>Earned {formatDate(earned.earnedAt)}</Text> : null}
          </View>

          {!earned && progress ? (
            <View style={styles.sectionCard}>
              <BadgeProgress progress={progress} />
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>How to earn</Text>
            <Text style={styles.sectionText}>{describeCriteria(badge.criteria)}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

function describeCriteria(criteria: any): string {
  switch (criteria?.type) {
    case 'first_show':
      return 'Log your first concert.';
    case 'show_count':
      return `Log ${criteria.count} concerts.`;
    case 'shows_in_month':
      return `Log ${criteria.count} shows in a single month.`;
    case 'consecutive_months':
      return `Log shows for ${criteria.count} months in a row.`;
    case 'same_artist':
      return `See the same artist ${criteria.count} times.`;
    case 'unique_venues':
      return `Visit ${criteria.count} different venues.`;
    case 'unique_cities':
      return `See shows in ${criteria.count} different cities.`;
    case 'unique_states':
      return `See shows in ${criteria.count} different states.`;
    case 'unique_countries':
      return `See shows in ${criteria.count} different countries.`;
    case 'genre_shows':
      return `See ${criteria.count} ${criteria.genre} shows.`;
    case 'same_venue':
      return `Log ${criteria.count} shows at the same venue.`;
    case 'festival':
      return 'Attend your first festival (coming soon).';
    case 'distance_traveled':
      return `Travel ${criteria.miles}+ miles for a show (coming soon).`;
    default:
      return 'Keep logging shows to unlock this badge.';
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  muted: {
    color: colors.textSecondary,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: 24,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  earnedAt: {
    marginTop: 6,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});



