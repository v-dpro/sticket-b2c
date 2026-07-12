// PlanCard — an upcoming plan (ticket / interested / tracking) above the
// Today divider. PLANS ARE NOT STUBS (C3): a plain card with a DASHED
// tokens.colors.dash border — the memory isn't real yet, so no notches, no
// perforation. Event name 17/700; venue · date in uppercase mono; bare mono
// countdown ("IN 21D") on the right.

import React from 'react';
import { Text, View } from 'react-native';

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
  party: 'PARTY',
};

/** The party line under a plan: "PARTY · 11 GOING · REQUEST TO JOIN". */
function partyLine(party: NonNullable<TimelineUpcomingItem['party']>): string {
  const state =
    party.myStatus === 'HOST'
      ? 'YOU HOST'
      : party.myStatus === 'GOING'
        ? "YOU'RE GOING"
        : party.myStatus === 'REQUESTED'
          ? 'REQUESTED'
          : party.myStatus === 'INVITED'
            ? 'INVITED'
            : 'TAP TO JOIN';
  return `${party.title.toUpperCase()} · ${party.goingCount} GOING · ${state}`;
}

export function PlanCard({ item, onPress }: PlanCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.card, // 16
      // Dashed = planned, not yet lived (C3). The dedicated dash token
      // reads clearly against both card fills.
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
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
      fontSize: 17,
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
    countdown: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
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
        {item.party ? (
          <Text style={[styles.meta, { color: tokens.colors.fg }]} numberOfLines={1}>
            {partyLine(item.party)}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.countdown,
          // "today" is the active state — weight, not hue (C1: accent = ink).
          { color: isToday ? tokens.colors.accent : tokens.colors.fg, fontWeight: isToday ? '800' : '600' },
        ]}
      >
        {countdownLabel(item.date)}
      </Text>
    </SpringPressable>
  );
}
