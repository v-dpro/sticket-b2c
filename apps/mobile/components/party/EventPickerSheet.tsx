// EventPickerSheet — "Host a party" from the Plan tab: pick one of your
// upcoming events (tickets / interested / tracked, from the owner-only
// timeline upcoming lane) and the create-party composer opens for it.
// Dashed rows — the party doesn't exist yet.
//
// Renders in the shared BottomSheet shell (swipe-down / backdrop to
// dismiss). Fully tokenized.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../hooks/useSession';
import { getUserTimeline, type TimelineEventSummary } from '../../lib/api/timeline';
import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BottomSheet } from '../ui/BottomSheet';
import { SpringPressable } from '../ui/SpringPressable';

interface EventPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the chosen event; the caller routes to /party/create. */
  onPick: (event: TimelineEventSummary) => void;
}

function monoEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}

export function EventPickerSheet({ visible, onClose, onPick }: EventPickerSheetProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { user } = useSession();

  const [events, setEvents] = useState<TimelineEventSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let alive = true;
    setEvents(null);
    setFailed(false);

    getUserTimeline(user.id, { limit: 1 })
      .then((res) => {
        if (!alive) return;
        // One row per event (a ticket + a hosted party can share one).
        const byId = new Map<string, TimelineEventSummary>();
        for (const item of res.upcoming) {
          if (!byId.has(item.event.id)) byId.set(item.event.id, item.event);
        }
        setEvents([...byId.values()]);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
    };
  }, [visible, user?.id]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.7} accessibilityLabel="Pick a show">
      <Text style={styles.title}>Host a party</Text>
      <Text style={styles.subtitle}>Pick one of your upcoming shows.</Text>

      {events === null && !failed ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={tokens.colors.mute} />
        </View>
      ) : failed ? (
        <Text style={styles.empty}>Couldn&apos;t load your upcoming shows right now.</Text>
      ) : events && events.length === 0 ? (
        <Text style={styles.empty}>
          No upcoming plans yet — save a ticket or mark a show you&apos;re interested in first, or
          host straight from any event page.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {events!.map((ev) => (
            <SpringPressable
              key={ev.id}
              haptic="light"
              onPress={() => {
                haptics.medium();
                onPick(ev);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Host a party for ${ev.name}`}
              style={styles.eventRow}
            >
              <View style={styles.eventBody}>
                <Text style={styles.eventName} numberOfLines={1}>
                  {ev.name}
                </Text>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {monoEventDate(ev.date)}
                  {ev.venue?.name ? ` · ${ev.venue.name}` : ''}
                </Text>
              </View>
              <Text style={styles.cue}>Host →</Text>
            </SpringPressable>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: tokens.colors.fg,
      paddingHorizontal: 20,
    },
    subtitle: {
      fontSize: 13,
      color: tokens.colors.mute,
      paddingHorizontal: 20,
      marginTop: 4,
    },
    loadingWrap: { alignItems: 'center', paddingVertical: 40 },
    listContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 10 },
    // Dashed = the party isn't real yet (planned/not-yet-lived).
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: tokens.colors.dash,
      borderRadius: tokens.radius.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    eventBody: { flex: 1, minWidth: 0, gap: 3 },
    eventName: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2, color: tokens.colors.fg },
    eventMeta: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    cue: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    empty: {
      fontSize: 13,
      color: tokens.colors.mute,
      textAlign: 'center',
      paddingHorizontal: 32,
      paddingVertical: 36,
      lineHeight: 19,
    },
  });
