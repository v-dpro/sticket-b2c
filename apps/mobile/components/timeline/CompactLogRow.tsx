// CompactLogRow — an unshared (or photo-less) logged show: quiet row card
// with artist (700), venue · date (mute), and the score chip on the right.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TimelineEntry } from '../../lib/api/timeline';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { ScoreChip } from './ScoreChip';
import { formatShortDate } from './format';

type CompactLogRowProps = {
  entry: TimelineEntry;
  onPress: () => void;
};

export function CompactLogRow({ entry, onPress }: CompactLogRowProps) {
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.density.cardPad,
      minHeight: t.density.rowH,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    artist: {
      fontSize: 15,
      fontWeight: '700',
      color: t.colors.fg,
    },
    meta: {
      fontSize: 12.5,
      fontWeight: '400',
      color: t.colors.mute,
      marginTop: 3,
    },
  }));

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`${entry.artist.name} at ${entry.venue.name}`}
      style={styles.card}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.artist} numberOfLines={1}>
          {entry.artist.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {entry.venue.name} · {formatShortDate(entry.event.date)}
        </Text>
      </View>
      {typeof entry.score === 'number' ? <ScoreChip score={entry.score} /> : null}
    </SpringPressable>
  );
}
