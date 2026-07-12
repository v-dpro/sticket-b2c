// CompactLogRow — an unshared (or photo-less) logged show: a light stub.
// Quiet row card with artist (700), venue · date in uppercase mono, and the
// score as a small rotated ScoreStamp on the right (C2 — flat surface, so
// the score wears its stamp body).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TimelineEntry } from '../../lib/api/timeline';
import { useThemedStyles } from '../../lib/theme-context';
import { ScoreStamp } from '../ui/Stub';
import { SpringPressable } from '../ui/SpringPressable';
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
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 4,
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
      {typeof entry.score === 'number' ? (
        <ScoreStamp score={entry.score} size={13} flat={false} />
      ) : null}
    </SpringPressable>
  );
}
