// FestivalWeekend — FESTIVAL MODE v1 (C12) for the tour page. A "festival
// weekend" is a purely client-side shape: a tour whose events (each event =
// one set) cluster at ONE venue within a 4-day window. When detected the
// tour page swaps its plain show list for this view:
//   weekend stub card (2px fg border, radius.stub, perforation) summarizing
//   "N SETS · M LOGGED · BEST 9.2" → ON NOW row (a set within now ± 4h,
//   promoted out of its day list, weight-800 + inverse mono tag) → day tabs
//   (mono pills, active = ink inversion) → the selected day's schedule rows
//   in schedule language (mono "19:30" · artist 15/700 · stage line ·
//   "b2b"/"CLOSER" vocabulary where derivable · per-set ScoreStamp when the
//   viewer logged that set).
// Zero accent hue — everything is ink/tokens; both themes via useTheme().

import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { TourEvent } from '../../lib/api/tours';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { ScoreStamp, StubDetailsRow, StubPerforation } from '../ui/Stub';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore, monoDate } from './format';

// ─── Detection — the festival-weekend shape ────────────────────────
// 2+ events, all at the same venue, spanning at most 4 consecutive
// calendar days (local time). Anything else renders the plain list.

const MAX_WINDOW_DAYS = 4;
const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000; // ON NOW: now ± 4h
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export type FestivalDay = {
  /** Local calendar-day key, "2026-07-10". */
  key: string;
  /** Tab label — "FRI"-style weekday (always distinct inside a ≤4-day window). */
  label: string;
  /** The day's sets, ascending by start time. */
  events: TourEvent[];
};

export type FestivalWeekendShape = {
  venueName: string;
  days: FestivalDay[];
  /** All sets, ascending by start time. */
  events: TourEvent[];
};

function dayKeyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function detectFestivalWeekend(events: TourEvent[]): FestivalWeekendShape | null {
  if (events.length < 2) return null;
  const venueId = events[0]!.venue.id;
  if (!events.every((e) => e.venue.id === venueId)) return null;

  const dated = events.map((e) => ({ event: e, time: new Date(e.date).getTime() }));
  if (dated.some((d) => Number.isNaN(d.time))) return null;
  dated.sort((a, b) => a.time - b.time);

  const byDay = new Map<string, TourEvent[]>();
  for (const { event, time } of dated) {
    const key = dayKeyOf(new Date(time));
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const first = new Date(dated[0]!.time);
  const last = new Date(dated[dated.length - 1]!.time);
  first.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const spanDays = Math.round((last.getTime() - first.getTime()) / 86400000) + 1;
  if (spanDays > MAX_WINDOW_DAYS) return null;

  const days: FestivalDay[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, dayEvents]) => ({
      key,
      label: WEEKDAYS[new Date(dayEvents[0]!.date).getDay()]!,
      events: dayEvents,
    }));

  return { venueName: events[0]!.venue.name, days, events: dated.map((d) => d.event) };
}

// ─── Schedule language helpers ─────────────────────────────────────

/** The viewer's log on a set — presence drives the mini ScoreStamp. */
export type FestivalLogRef = { logId: string; score: number | null };

/** Local 24h "19:30" from the event's ISO datetime. */
function monoTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Set titles in the catalog embed context after an em dash — either the
// tour name ("FISHER — EDC Las Vegas", drop it) or a stage ("FISHER —
// Kinetic Field", keep as the stage line). "b2b" is normalized to its
// schedule-language lowercase.
function splitSetName(eventName: string, tourName: string): { title: string; stage: string | null } {
  const normalize = (s: string) => s.replace(/\b(b2b)\b/gi, 'b2b');
  const parts = eventName.split('—').map((s) => s.trim());
  if (parts.length === 2 && parts[0] && parts[1]) {
    const tour = tourName.trim().toLowerCase();
    if (parts[1].toLowerCase() === tour) return { title: normalize(parts[0]), stage: null };
    if (parts[0].toLowerCase() === tour) return { title: normalize(parts[1]), stage: null };
    return { title: normalize(parts[0]), stage: parts[1] };
  }
  return { title: normalize(eventName), stage: null };
}

/** "JUL 10–12" (or "JUL 30 – AUG 1" across months) for the stub card. */
function monoDateRange(firstIso: string, lastIso: string): string {
  const a = new Date(firstIso);
  const b = new Date(lastIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  if (dayKeyOf(a) === dayKeyOf(b)) return monoDate(firstIso);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${monoDate(firstIso)}–${b.getDate()}`;
  }
  return `${monoDate(firstIso)} – ${monoDate(lastIso)}`;
}

// ─── ScheduleRow — one set in schedule language ────────────────────

type ScheduleRowProps = {
  event: TourEvent;
  tourName: string;
  log?: FestivalLogRef;
  onNow?: boolean;
  closer?: boolean;
  index: number;
  onPress: (event: TourEvent) => void;
};

function ScheduleRow({ event, tourName, log, onNow = false, closer = false, index, onPress }: ScheduleRowProps) {
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
    },
    time: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      fontWeight: '600',
      color: t.colors.mute,
      width: 44,
    },
    body: { flex: 1, minWidth: 0, gap: 3 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 15, fontWeight: '700', color: t.colors.fg, flexShrink: 1 },
    titleOnNow: { fontWeight: '800' },
    onNowTag: {
      backgroundColor: t.colors.inverseBg,
      borderRadius: t.radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    onNowTagText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1,
      color: t.colors.inverseFg,
    },
    meta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  }));

  const { title, stage } = splitSetName(event.name, tourName);
  const meta = [stage, closer ? 'CLOSER' : null].filter(Boolean).join(' · ');

  return (
    <Animated.View entering={tearIn(Math.min(index, 8) * durations.stagger)}>
      <SpringPressable
        haptic="light"
        onPress={() => onPress(event)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${monoTime(event.date)}${onNow ? ', on now' : ''}`}
        style={styles.row}
      >
        <Text style={styles.time}>{monoTime(event.date)}</Text>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, onNow && styles.titleOnNow]} numberOfLines={1}>
              {title}
            </Text>
            {onNow ? (
              <View style={styles.onNowTag}>
                <Text style={styles.onNowTagText}>ON NOW</Text>
              </View>
            ) : null}
          </View>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {log && typeof log.score === 'number' && Number.isFinite(log.score) ? (
          <ScoreStamp score={log.score} size={12} flat />
        ) : null}
      </SpringPressable>
    </Animated.View>
  );
}

// ─── FestivalWeekend — the full festival view ──────────────────────

type FestivalWeekendProps = {
  festival: FestivalWeekendShape;
  tourName: string;
  /** eventId → the viewer's log on that set (drives stamps + summary). */
  myLogs: Record<string, FestivalLogRef>;
  onPressEvent: (event: TourEvent) => void;
};

export function FestivalWeekend({ festival, tourName, myLogs, onPressEvent }: FestivalWeekendProps) {
  const { tokens } = useTheme();
  const { days, events } = festival;

  // ON NOW — the set whose start time is within now ± 4h, nearest to now.
  // Recomputed whenever the festival data refreshes (pull-to-refresh).
  const onNowEvent = useMemo(() => {
    const now = Date.now();
    let best: TourEvent | null = null;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const event of events) {
      const delta = Math.abs(now - new Date(event.date).getTime());
      if (delta <= LIVE_WINDOW_MS && delta < bestDelta) {
        best = event;
        bestDelta = delta;
      }
    }
    return best;
  }, [events]);

  // Default tab: the live set's day → today (if inside the window) → day 1.
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    if (onNowEvent) return dayKeyOf(new Date(onNowEvent.date));
    const todayKey = dayKeyOf(new Date());
    return days.some((d) => d.key === todayKey) ? todayKey : days[0]!.key;
  });
  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[0]!;

  // Weekend stub summary — N SETS · M LOGGED · BEST 9.2 (best only when
  // at least one logged set carries a score).
  const loggedCount = events.filter((e) => myLogs[e.id]).length;
  const bestScore = events.reduce<number | null>((best, e) => {
    const score = myLogs[e.id]?.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) return best;
    return best == null || score > best ? score : best;
  }, null);

  const styles = useThemedStyles((t) => ({
    stubCard: {
      borderWidth: 2,
      borderColor: t.colors.fg,
      borderRadius: t.radius.stub,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 14,
    },
    summary: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    summaryNum: { fontWeight: '700', color: t.colors.fg },
    tabsRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
    tab: {
      height: 30,
      paddingHorizontal: 14,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabActive: { backgroundColor: t.colors.inverseBg },
    tabText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.mute,
    },
    tabTextActive: { color: t.colors.inverseFg, fontWeight: '700' },
  }));

  const firstEvent = events[0]!;
  const lastEvent = events[events.length - 1]!;

  return (
    <View>
      {/* Weekend stub — the one summary card (2px fg border, perforation
          punching through to the screen bg). */}
      <Animated.View entering={tearIn(0)} style={styles.stubCard}>
        <StubDetailsRow left="FESTIVAL WEEKEND" right={monoDateRange(firstEvent.date, lastEvent.date)} />
        <StubPerforation notchColor={tokens.colors.bg} style={{ marginVertical: 8 }} />
        <Text style={styles.summary}>
          <Text style={styles.summaryNum}>{events.length}</Text>
          {' SETS · '}
          <Text style={styles.summaryNum}>{loggedCount}</Text>
          {' LOGGED'}
          {bestScore != null ? (
            <>
              {' · BEST '}
              <Text style={styles.summaryNum}>{formatScore(bestScore)}</Text>
            </>
          ) : null}
        </Text>
      </Animated.View>

      {/* ON NOW — promoted out of its day list while live. */}
      {onNowEvent ? (
        <ScheduleRow
          event={onNowEvent}
          tourName={tourName}
          log={myLogs[onNowEvent.id]}
          onNow
          index={0}
          onPress={onPressEvent}
        />
      ) : null}

      {/* Day tabs — mono pills, active = ink inversion, haptic on switch. */}
      <View style={styles.tabsRow}>
        {days.map((day) => {
          const active = day.key === selectedDay.key;
          return (
            <SpringPressable
              key={day.key}
              haptic="none"
              onPress={() => {
                if (day.key === selectedKey) return;
                haptics.light();
                setSelectedKey(day.key);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Day ${day.label}`}
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{day.label}</Text>
            </SpringPressable>
          );
        })}
      </View>

      {/* The selected day's schedule — keyed by day so switching tabs
          re-runs the tearIn stagger. */}
      <View key={selectedDay.key}>
        {selectedDay.events
          .filter((event) => event.id !== onNowEvent?.id)
          .map((event, i) => (
            <ScheduleRow
              key={event.id}
              event={event}
              tourName={tourName}
              log={myLogs[event.id]}
              closer={
                selectedDay.events.length > 1 &&
                event.id === selectedDay.events[selectedDay.events.length - 1]!.id
              }
              index={i}
              onPress={onPressEvent}
            />
          ))}
      </View>
    </View>
  );
}
