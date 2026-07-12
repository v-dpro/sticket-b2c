// EventRow — the shared show-row anatomy for entity deep-dive lists
// (tour "Shows" list, venue "All shows here" screen):
//   title 700 · mono meta line (venue·city·date or artist·date) ·
//   mono logCount + avgScore chips · chevron.
// Tears in (tearIn stagger) via the caller-supplied index.

import React, { memo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import { durations, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { MonoChip } from './EntityBits';
import { formatScore } from './format';

type EventRowProps = {
  title: string;
  /** Mono metadata line, e.g. "MSG · NEW YORK · JUL 14 2026". */
  meta: string;
  logCount?: number | null;
  avgScore?: number | null;
  onPress: () => void;
  /** List index for the 40ms/row entering stagger (capped at 8). */
  index?: number;
};

// Memoized so parent list re-renders (pagination spinners, refresh state)
// skip unchanged rows. Callers pass inline `onPress` closures, so the
// comparator checks the data props and deliberately ignores `onPress` —
// those closures only capture the row's own (unchanged) event id.
export const EventRow = memo(function EventRow({
  title,
  meta,
  logCount,
  avgScore,
  onPress,
  index = 0,
}: EventRowProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    body: { flex: 1, minWidth: 0, gap: 4 },
    title: { fontSize: 15, fontWeight: '700', color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  }));

  const showLogs = typeof logCount === 'number' && logCount > 0;
  const showScore = typeof avgScore === 'number' && Number.isFinite(avgScore);

  return (
    <Animated.View entering={tearIn(Math.min(index, 8) * durations.stagger)}>
      <SpringPressable
        haptic="light"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${meta}`}
        style={styles.row}
      >
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {showLogs ? <MonoChip label={`${logCount} ${logCount === 1 ? 'LOG' : 'LOGS'}`} /> : null}
        {showScore ? <MonoChip label={formatScore(avgScore)} /> : null}
        <Ionicons name="chevron-forward" size={15} color={tokens.colors.muteSoft} />
      </SpringPressable>
    </Animated.View>
  );
},
(prev, next) =>
  prev.title === next.title &&
  prev.meta === next.meta &&
  prev.logCount === next.logCount &&
  prev.avgScore === next.avgScore &&
  prev.index === next.index);
