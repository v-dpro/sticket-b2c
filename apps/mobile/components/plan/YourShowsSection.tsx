// Plan · YOUR SHOWS — the signed-in user's upcoming ticketed shows, leading
// the Plan tab. Source is the aggregated timeline `upcoming` payload filtered
// to type 'ticket' (reusing the server's party-chip logic, no duplication),
// merged with GET /users/me/reminders so each row's REMIND ME switch hydrates.
//
// Each card is a dashed STUB-less plan (C3 — the night hasn't happened): event
// name, venue · date mono, a live countdown ("TONIGHT" / "IN 7D"), a party
// chip line when a party rides that event (mirrors the timeline PlanCard), and
// a REMIND ME switch (ShowReminder) that fires a show-day morning nudge.
// Tapping a card opens THE NIGHT (/night/[eventId]) — the per-show plan canvas.

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useSession } from '../../hooks/useSession';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { getMyReminders, addReminder, removeReminder } from '../../lib/api/reminders';
import { getUserTimeline, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { ErrorState } from '../ui/ErrorState';
import { SpringPressable } from '../ui/SpringPressable';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - startOfToday()) / 86400000));
}

/** "TONIGHT" / "IN 7D" / "IN 3MO" — the countdown chip copy. */
function countdownLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'TONIGHT';
  if (days < 60) return `IN ${days}D`;
  return `IN ${Math.round(days / 30)}MO`;
}

function formatShowDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

/** "TITLE · 11 GOING · YOU HOST" — mirrors the timeline PlanCard party line. */
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

export function YourShowsSection() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useSession();

  const [shows, setShows] = useState<TimelineUpcomingItem[]>([]);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setStatus('ready');
      return;
    }
    try {
      const [timeline, reminderIds] = await Promise.all([
        getUserTimeline(user.id, { limit: 1 }),
        getMyReminders(),
      ]);
      const today = startOfToday();
      const tickets = (timeline.upcoming ?? [])
        .filter((u) => u.type === 'ticket' && new Date(u.date).getTime() >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setShows(tickets);
      setReminded(new Set(reminderIds));
      setStatus('ready');
    } catch (e) {
      setErrorMsg(getErrorMessage(e));
      setStatus('error');
    }
  }, [user?.id]);

  // Refresh on focus so a reminder toggled elsewhere / a new ticket shows up.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleRemind = useCallback(
    async (eventId: string) => {
      const currently = reminded.has(eventId);
      // Optimistic flip; revert on failure.
      setReminded((prev) => {
        const next = new Set(prev);
        if (currently) next.delete(eventId);
        else next.add(eventId);
        return next;
      });
      setBusyEvent(eventId);
      try {
        if (currently) await removeReminder(eventId);
        else await addReminder(eventId);
        haptics.success();
      } catch {
        haptics.error();
        setReminded((prev) => {
          const next = new Set(prev);
          if (currently) next.add(eventId);
          else next.delete(eventId);
          return next;
        });
      } finally {
        setBusyEvent(null);
      }
    },
    [reminded],
  );

  const styles = useThemedStyles((t) => ({
    section: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 18,
      marginBottom: 10,
    },
    center: { paddingVertical: 40, alignItems: 'center' },
    emptyNote: {
      fontSize: 13.5,
      color: t.colors.mute,
      paddingHorizontal: t.density.pad,
      paddingBottom: 8,
    },
    // Plans are dashed — the night hasn't happened yet (C3).
    card: {
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    showRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowImage: {
      width: 44,
      height: 44,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
    rowImageFallback: { alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, minWidth: 0, gap: 4 },
    rowTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    rowMeta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    partyMeta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.fg,
    },
    countdown: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.5,
      color: t.colors.fg,
    },
    chipTonight: {
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.inverseBg,
    },
    chipTextTonight: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.inverseFg,
    },
    remindRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
    },
    remindLabel: {
      flex: 1,
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  }));

  const renderShow = (item: TimelineUpcomingItem, index: number) => {
    const { event } = item;
    const isTonight = daysUntil(item.date) === 0;
    const imageUrl = event.imageUrl || event.artist?.imageUrl || null;
    const on = reminded.has(event.id);
    return (
      <Animated.View key={item.id} entering={tearIn(Math.min(index, 8) * durations.stagger)}>
        <View style={styles.card}>
          <SpringPressable
            haptic="light"
            onPress={() => router.push(`/night/${event.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${event.name} at ${event.venue.name}, ${countdownLabel(item.date)} — open your night plan`}
            style={styles.showRow}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.rowImage}
                contentFit="cover"
                transition={80}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.rowImage, styles.rowImageFallback]}>
                <Ionicons name="ticket-outline" size={20} color={tokens.colors.mute} />
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {event.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {event.venue.name}
                {event.venue.city ? ` · ${event.venue.city}` : ''} · {formatShowDate(item.date)}
              </Text>
              {item.party ? (
                <Text style={styles.partyMeta} numberOfLines={1}>
                  {partyLine(item.party)}
                </Text>
              ) : null}
            </View>
            {isTonight ? (
              <View style={styles.chipTonight}>
                <Text style={styles.chipTextTonight}>TONIGHT</Text>
              </View>
            ) : (
              <Text style={styles.countdown}>{countdownLabel(item.date)}</Text>
            )}
          </SpringPressable>

          <View style={styles.remindRow}>
            <Text style={styles.remindLabel}>Remind me</Text>
            <Switch
              value={on}
              onValueChange={() => void toggleRemind(event.id)}
              disabled={busyEvent === event.id}
              trackColor={{ false: tokens.colors.card2, true: tokens.colors.success }}
              thumbColor={tokens.colors.white}
              ios_backgroundColor={tokens.colors.card2}
              accessibilityLabel={`Remind me about ${event.name}`}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View>
      <Text style={styles.section}>Your shows</Text>
      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
        </View>
      ) : status === 'error' ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
          <ErrorState title="Couldn't load your shows" message={errorMsg ?? undefined} onRetry={() => void load()} />
        </View>
      ) : shows.length === 0 ? (
        <Text style={styles.emptyNote}>No upcoming shows — grab a ticket and it lands here.</Text>
      ) : (
        shows.map((item, i) => renderShow(item, i))
      )}
    </View>
  );
}
