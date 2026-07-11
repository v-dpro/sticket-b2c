import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useBadges } from '../../hooks/useBadges';
import { BadgeIcon, getRarityColor } from '../../components/badges/BadgeIcon';
import { BadgeProgress } from '../../components/badges/BadgeProgress';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BadgeDetailScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { allBadges, earnedBadges, getProgress, loading, error } = useBadges();

  const badge = allBadges.find((b) => b.id === id);
  const earned = earnedBadges.find((b) => b.badge.id === id);
  const progress = badge ? getProgress(badge.id) : undefined;

  const rarityColor = badge ? getRarityColor(tokens.colors, badge.rarity) : tokens.colors.accent;

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      marginBottom: 8,
    },
    iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: t.colors.fg, fontSize: 18, fontWeight: '800' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 12 },
    muted: { color: t.colors.mute },
    content: { paddingTop: t.spacing.lg, paddingBottom: 24, gap: 14 },
    hero: {
      alignItems: 'center',
      gap: 10,
      padding: 16,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    title: { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
    description: { color: t.colors.mute, fontSize: 14, textAlign: 'center' },
    metaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: t.colors.card2,
    },
    pillText: { fontFamily: t.fontFamilies.mono, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
    earnedAt: { marginTop: 6, color: t.colors.muteSoft, fontSize: 12, fontWeight: '500' },
    sectionCard: {
      padding: 16,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    sectionTitle: { color: t.colors.fg, fontSize: 14, fontWeight: '700', marginBottom: 8 },
    sectionText: { color: t.colors.mute, fontSize: 13, lineHeight: 18 },
  }));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.iconButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.headerTitle}>Badge</Text>
        <View style={styles.iconButton} />
      </View>

      {loading && !badge ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.colors.mute} />
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
              <View style={[styles.pill, { backgroundColor: `${rarityColor}20` }]}>
                <Text style={[styles.pillText, { color: rarityColor }]}>{badge.rarity.toUpperCase()}</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="star" size={12} color={tokens.colors.warning} />
                <Text style={[styles.pillText, { color: tokens.colors.warning }]}>+{badge.points} pts</Text>
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
    </SafeAreaView>
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
