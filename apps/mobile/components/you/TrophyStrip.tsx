// TrophyStrip — the You header's row of earned "trophy" chips (§4 You /
// C20): bordered mono chips like "7 MO STREAK" · "2019 FIRST · OASIS" ·
// "N VENUES" · "N CITIES". Ink-only, data-driven from the collection
// trophies. Complements (does not replace) the CollectorScorecard — this
// is the at-a-glance strip; the scorecard is the ranked tally. Renders
// nothing until at least one chip has content.

import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { CollectionTrophies } from '../../lib/api/collection';
import { useThemedStyles } from '../../lib/theme-context';

function firstYear(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getFullYear());
}

export function TrophyStrip({ trophies }: { trophies?: CollectionTrophies }) {
  const styles = useThemedStyles((t) => ({
    scroll: { paddingHorizontal: t.density.pad, gap: 8, paddingTop: 10, paddingBottom: 2 },
    chip: {
      borderWidth: 1,
      borderColor: t.colors.line,
      borderRadius: t.radius.chip,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: t.colors.card,
    },
    chipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.text,
    },
  }));

  if (!trophies) return null;

  const chips: string[] = [];
  if (trophies.streak.months > 0) chips.push(`${trophies.streak.months} MO STREAK`);
  if (trophies.firsts.firstShow) {
    const yr = firstYear(trophies.firsts.firstShow.date);
    chips.push(
      [yr ? `${yr} FIRST` : 'FIRST', trophies.firsts.firstShow.artistName].filter(Boolean).join(' · '),
    );
  }
  if (trophies.firsts.venuesCount > 0) chips.push(`${trophies.firsts.venuesCount} VENUES`);
  if (trophies.firsts.citiesCount > 0) chips.push(`${trophies.firsts.citiesCount} CITIES`);

  if (chips.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {chips.map((c) => (
        <View key={c} style={styles.chip}>
          <Text style={styles.chipText}>{c}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
