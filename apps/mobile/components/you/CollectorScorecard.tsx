// CollectorScorecard — the gamified head of the You page. Your collector
// RANK (from distinct venues unlocked) with a progress bar to the next
// standing, and three big tallies: VENUES · CITIES · ARTISTS. Ink-only,
// ticket-stub language — the progress bar is a perforation that fills.

import React from 'react';
import { Text, View } from 'react-native';

import { collectorRank } from '../../lib/gamification';
import { useThemedStyles } from '../../lib/theme-context';

type CollectorScorecardProps = {
  venues: number;
  cities: number;
  artists: number;
};

export function CollectorScorecard({ venues, cities, artists }: CollectorScorecardProps) {
  const rank = collectorRank(venues);
  const styles = useThemedStyles((t) => ({
    card: {
      marginHorizontal: t.density.pad,
      marginTop: 12,
      padding: 16,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      gap: 14,
    },
    rankRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    rankLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.4,
      color: t.colors.muteSoft,
    },
    rankName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: t.colors.fg },
    nextLine: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.6,
      color: t.colors.muteSoft,
    },
    // Progress rail — a perforated bar that fills toward the next rank.
    rail: {
      height: 6,
      borderRadius: 3,
      backgroundColor: t.colors.card2,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 3, backgroundColor: t.colors.fg },
    stats: { flexDirection: 'row', gap: 10 },
    stat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: t.radius.chip,
      backgroundColor: t.colors.card2,
    },
    statNum: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 22,
      color: t.colors.fg,
    },
    statLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      letterSpacing: 1,
      color: t.colors.muteSoft,
      marginTop: 3,
    },
  }));

  return (
    <View style={styles.card}>
      <View style={styles.rankRow}>
        <View>
          <Text style={styles.rankLabel}>COLLECTOR RANK</Text>
          <Text style={styles.rankName}>{rank.name}</Text>
        </View>
        <Text style={styles.nextLine}>
          {rank.nextAt != null ? `${rank.nextAt - venues} TO NEXT` : 'MAXED'}
        </Text>
      </View>
      <View style={styles.rail}>
        <View style={[styles.fill, { width: `${Math.round(rank.progress * 100)}%` }]} />
      </View>
      <View style={styles.stats}>
        {[
          { n: venues, l: 'VENUES' },
          { n: cities, l: 'CITIES' },
          { n: artists, l: 'ARTISTS' },
        ].map((s) => (
          <View key={s.l} style={styles.stat}>
            <Text style={styles.statNum}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
