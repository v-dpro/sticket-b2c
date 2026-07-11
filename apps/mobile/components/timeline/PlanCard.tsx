// PlanCard — an upcoming plan (ticket / interested / tracking) above the
// Today divider. Event name leads (800); venue · date muted; mono countdown
// chip ("in 76d") on the right.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TimelineUpcomingItem } from '../../lib/api/timeline';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { countdownLabel, daysUntil, formatShortDate } from './format';

type PlanCardProps = {
  item: TimelineUpcomingItem;
  onPress: () => void;
};

const INTENT_LABEL: Record<TimelineUpcomingItem['type'], string | null> = {
  ticket: null, // tickets are the default plan — no eyebrow noise
  interested: 'INTERESTED',
  tracking: 'TRACKING',
};

export function PlanCard({ item, onPress }: PlanCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    intent: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: t.colors.muteSoft,
      marginBottom: 3,
    },
    name: {
      fontSize: 15,
      fontWeight: '800',
      color: t.colors.fg,
    },
    meta: {
      fontSize: 12.5,
      fontWeight: '400',
      color: t.colors.mute,
      marginTop: 3,
    },
    chip: {
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 10,
      height: 24,
      justifyContent: 'center',
    },
    chipText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
    },
  }));

  const intent = INTENT_LABEL[item.type];
  const isToday = daysUntil(item.date) === 0;

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`${item.event.name}, ${countdownLabel(item.date)}`}
      style={styles.card}
    >
      <View style={{ flex: 1 }}>
        {intent ? <Text style={styles.intent}>{intent}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>
          {item.event.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.event.venue.name} · {formatShortDate(item.event.date)}
        </Text>
      </View>
      <View style={styles.chip}>
        <Text
          style={[
            styles.chipText,
            // "today" is an active state — the one sanctioned small accent use here.
            { color: isToday ? tokens.colors.accent : tokens.colors.fg },
          ]}
        >
          {countdownLabel(item.date)}
        </Text>
      </View>
    </SpringPressable>
  );
}
