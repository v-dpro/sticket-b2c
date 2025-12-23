import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { LogEntry } from '../../types/profile';
import { YearFilter } from './YearFilter';
import { colors } from '../../lib/theme';

interface ProfileStatsViewProps {
  headerComponent?: React.ReactNode;
  logs: LogEntry[];
  years: number[];
  selectedYear: number | null;
  onYearSelect: (year: number | null) => void;
  loading: boolean;
  onRefresh: () => void;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={16} color={colors.textPrimary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ProfileStatsView({ headerComponent, logs, years, selectedYear, onYearSelect, loading, onRefresh }: ProfileStatsViewProps) {
  const computed = useMemo(() => {
    const artistIds = new Set<string>();
    const venueIds = new Set<string>();
    let ratingSum = 0;
    let ratingCount = 0;
    const byYear = new Map<number, number>();

    for (const l of logs) {
      artistIds.add(l.event.artist.id);
      venueIds.add(l.event.venue.id);
      const y = new Date(l.event.date).getFullYear();
      byYear.set(y, (byYear.get(y) || 0) + 1);
      if (typeof l.rating === 'number') {
        ratingSum += l.rating;
        ratingCount += 1;
      }
    }

    const avg = ratingCount ? ratingSum / ratingCount : null;
    const yearRows = [...byYear.entries()].sort((a, b) => b[0] - a[0]).slice(0, 8);
    return {
      totalShows: logs.length,
      artists: artistIds.size,
      venues: venueIds.size,
      avgRating: avg,
      yearRows,
    };
  }, [logs]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading && logs.length === 0} onRefresh={onRefresh} tintColor={colors.brandPurple} />}
    >
      {headerComponent}
      <YearFilter years={years} selectedYear={selectedYear} onSelect={onYearSelect} />

      <View style={styles.grid}>
        <StatCard title="Shows" value={`${computed.totalShows}`} subtitle={selectedYear ? `in ${selectedYear}` : 'all time'} icon="ticket" />
        <StatCard title="Artists" value={`${computed.artists}`} subtitle="unique" icon="mic" />
        <StatCard title="Venues" value={`${computed.venues}`} subtitle="unique" icon="location" />
        <StatCard
          title="Avg rating"
          value={computed.avgRating == null ? '—' : computed.avgRating.toFixed(1)}
          subtitle={computed.avgRating == null ? 'rate shows to see this' : 'from rated shows'}
          icon="star"
        />
      </View>

      <View style={styles.breakdown}>
        <Text style={styles.sectionTitle}>Year breakdown</Text>
        {computed.yearRows.length ? (
          computed.yearRows.map(([y, c]) => (
            <View key={y} style={styles.row}>
              <Text style={styles.rowYear}>{y}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.rowCount}>{c} show{c === 1 ? '' : 's'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Log a show to start seeing your stats.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  breakdown: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 43, 77, 0.6)',
  },
  rowYear: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  rowCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
});



