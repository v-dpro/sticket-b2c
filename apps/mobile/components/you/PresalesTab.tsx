// You · PRESALES — the tracking agenda (was the Upcoming tab): presales
// this week with live countdowns + tap-to-copy codes, your ticketed shows,
// and the ones you're circling. Rows tap through to events/presales.

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import { PillButton } from '../ui/PillButton';
import { Skeleton } from '../ui/Skeleton';
import { SpringPressable } from '../ui/SpringPressable';
import { StubPerforation } from '../ui/Stub';
import { useConcertLife } from '../../hooks/useConcertLife';
import { usePresales, type PresaleItem } from '../../hooks/usePresales';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

type UpcomingRow = {
  id: string;
  kind: 'ticketed' | 'interested';
  artistName: string;
  venueName: string;
  venueCity: string;
  date: string;
  imageUrl: string | null;
  eventId?: string;
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  return Math.max(0, Math.ceil((target - startOfToday()) / 86400000));
}

function countdownLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'TODAY';
  if (days < 60) return `IN ${days}D`;
  const months = Math.round(days / 30);
  return `IN ${months}MO`;
}

/** "41 D" — a ticketed stub's bare day-count countdown (spec §4 TICKETED). */
function daysLabel(dateStr: string): string {
  return `${daysUntil(dateStr)} D`;
}

function formatShowDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "FRI, JUL 17 · 10:00 AM" — mono data line for a presale's start. */
function presaleDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`.toUpperCase();
}

/** Countdown to the presale start — hour-granular since presales are timed. */
function presaleCountdown(p: PresaleItem, now: number = Date.now()): string {
  const start = new Date(p.presaleStart).getTime();
  if (Number.isNaN(start)) return '';
  if (start <= now) return 'LIVE';
  const diff = start - now;
  if (diff < 3600000) {
    const mins = Math.max(1, Math.ceil(diff / 60000));
    return `${mins} MIN`;
  }
  if (diff < 86400000) {
    const hrs = Math.ceil(diff / 3600000);
    return `${hrs} ${hrs === 1 ? 'HR' : 'HRS'}`;
  }
  const days = Math.ceil(diff / 86400000);
  return `${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
}

function toRow(raw: any, kind: UpcomingRow['kind']): UpcomingRow {
  return {
    id: String(raw.id),
    kind,
    artistName: raw.event?.artist?.name || raw.artistName || 'Unknown artist',
    venueName: raw.event?.venue?.name || raw.venueName || 'Venue TBA',
    venueCity: raw.event?.venue?.city || raw.venueCity || '',
    date: raw.date,
    imageUrl: raw.event?.imageUrl || raw.event?.artist?.imageUrl || null,
    eventId: raw.event?.id,
  };
}

export function PresalesTab() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      marginTop: 18,
      marginBottom: 10,
    },
    sectionLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    calendarLink: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    row: {
      minHeight: t.density.rowH,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
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
    countdown: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.5,
      color: t.colors.fg,
    },
    chipToday: {
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.inverseBg,
    },
    chipTextToday: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.inverseFg,
    },
    presaleMono: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.8,
      color: t.colors.mute,
    },
    presaleRight: { alignItems: 'flex-end', gap: 8 },
    codeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      borderWidth: 1,
      borderColor: t.colors.line,
    },
    codeChipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.text,
    },
    // ── Imminent presale (THIS WEEK) — fg border, grows inline actions ──
    imminentCard: {
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      borderRadius: t.radius.card,
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      backgroundColor: t.colors.card,
      gap: 12,
    },
    imminentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    imminentActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    codeChipLg: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: t.radius.sm,
      borderWidth: 1,
      borderColor: t.colors.fg,
    },
    codeChipTextLg: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      letterSpacing: 0.5,
      color: t.colors.fg,
    },
    // ── Ticketed stub (a held ticket is a stub — C3; notched, "41 D") ──
    stub: {
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      borderRadius: t.radius.stub,
      borderWidth: 1,
      borderColor: t.colors.line,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    stubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    stubFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    footMono: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    empty: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
      gap: t.density.gap,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    emptyBody: { fontSize: 14, color: t.colors.textSoft, textAlign: 'center', lineHeight: 20 },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.pad,
      paddingVertical: 10,
    },
  }));

  const { data, loading, error } = useConcertLife();
  const { presales } = usePresales();

  const [copiedPresaleId, setCopiedPresaleId] = useState<string | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    },
    []
  );
  const copyPresaleCode = useCallback(async (presale: PresaleItem) => {
    if (!presale.code) return;
    try {
      await Clipboard.setStringAsync(presale.code);
      haptics.success();
      setCopiedPresaleId(presale.id);
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopiedPresaleId(null), 1600);
    } catch {
      // clipboard unavailable
    }
  }, []);

  // Tickets primary → out to the seller when we have a link, else the
  // presale sheet (which carries the same buy CTA, A16).
  const openTickets = useCallback(
    (presale: PresaleItem) => {
      haptics.light();
      if (presale.ticketUrl) {
        void Linking.openURL(presale.ticketUrl).catch(() => router.push(`/presales/${presale.id}`));
      } else {
        router.push(`/presales/${presale.id}`);
      }
    },
    [router],
  );

  const weekPresales = useMemo<PresaleItem[]>(() => {
    const now = Date.now();
    const weekOut = now + 7 * 86400000;
    return presales
      .filter((p) => {
        const start = new Date(p.presaleStart).getTime();
        if (Number.isNaN(start)) return false;
        const end = p.presaleEnd ? new Date(p.presaleEnd).getTime() : start;
        return start <= weekOut && (Number.isNaN(end) ? start >= now : end >= now);
      })
      .sort((a, b) => new Date(a.presaleStart).getTime() - new Date(b.presaleStart).getTime())
      .slice(0, 8);
  }, [presales]);

  const { ticketed, interested } = useMemo(() => {
    const today = startOfToday();
    const notPast = (raw: any) => new Date(raw?.date ?? '').getTime() >= today;

    const ticketedRows: UpcomingRow[] = [
      ...(data?.upcomingTickets ?? []).filter(notPast).map((t: any) => toRow(t, 'ticketed')),
      ...((data as any)?.upcomingLogs ?? []).filter(notPast).map((l: any) => toRow(l, 'ticketed')),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const interestedRows: UpcomingRow[] = (data?.tracking ?? [])
      .filter(notPast)
      .map((t: any) => toRow(t, 'interested'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { ticketed: ticketedRows, interested: interestedRows };
  }, [data]);

  const total = ticketed.length + interested.length;

  const rowImage = (row: UpcomingRow) =>
    row.imageUrl ? (
      <Image
        source={{ uri: row.imageUrl }}
        style={styles.rowImage}
        contentFit="cover"
        transition={80}
        cachePolicy="memory-disk"
      />
    ) : (
      <View style={[styles.rowImage, styles.rowImageFallback]}>
        <Ionicons
          name={row.kind === 'ticketed' ? 'ticket-outline' : 'star-outline'}
          size={20}
          color={tokens.colors.mute}
        />
      </View>
    );

  // TICKETED — a held ticket is a stub (C3): solid border + punched notches
  // + bare "41 D" day-count. INTERESTED stays a dashed plan row (renderRow).
  const renderTicketedStub = (row: UpcomingRow, index: number) => {
    const isToday = daysUntil(row.date) === 0;
    return (
      <Animated.View key={`${row.kind}-${row.id}`} entering={tearIn(Math.min(index, 8) * durations.stagger)}>
        <View style={styles.stub}>
          <SpringPressable
            haptic="light"
            disabled={!row.eventId}
            shakeWhenDisabled={false}
            onPress={() => {
              if (row.eventId) router.push(`/event/${row.eventId}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${row.artistName} at ${row.venueName}, ${formatShowDate(row.date)}`}
            style={styles.stubRow}
          >
            {rowImage(row)}
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {row.artistName}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {row.venueName}
                {row.venueCity ? ` · ${row.venueCity}` : ''}
              </Text>
            </View>
            {isToday ? (
              <View style={styles.chipToday}>
                <Text style={styles.chipTextToday}>TODAY</Text>
              </View>
            ) : (
              <Text style={styles.countdown}>{daysLabel(row.date)}</Text>
            )}
          </SpringPressable>
          <StubPerforation notchColor={tokens.colors.bg} dashColor={tokens.colors.dash} />
          <View style={styles.stubFoot}>
            <Text style={styles.footMono} numberOfLines={1}>
              {formatShowDate(row.date).toUpperCase()}
            </Text>
            <Text style={styles.footMono}>ADMIT 01</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderRow = (row: UpcomingRow, index: number) => {
    return (
      <Animated.View key={`${row.kind}-${row.id}`} entering={tearIn(Math.min(index, 8) * durations.stagger)}>
        <SpringPressable
          haptic="light"
          disabled={!row.eventId}
          shakeWhenDisabled={false}
          onPress={() => {
            if (row.eventId) router.push(`/event/${row.eventId}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${row.artistName} at ${row.venueName}, ${formatShowDate(row.date)}`}
          style={styles.row}
        >
          {rowImage(row)}
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {row.artistName}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {row.venueName}
              {row.venueCity ? ` · ${row.venueCity}` : ''} · {formatShowDate(row.date)}
            </Text>
          </View>
          <Text style={styles.countdown}>{countdownLabel(row.date)}</Text>
        </SpringPressable>
      </Animated.View>
    );
  };

  const renderPresaleRow = (presale: PresaleItem, index: number) => {
    const countdown = presaleCountdown(presale);
    const isLive = countdown === 'LIVE';
    const copied = copiedPresaleId === presale.id;
    // Imminent = live or inside 48h — this one grows inline actions (§4).
    const start = new Date(presale.presaleStart).getTime();
    const imminent = isLive || (!Number.isNaN(start) && start - Date.now() < 48 * 3600000);

    const countdownChip = isLive ? (
      <View style={styles.chipToday}>
        <Text style={styles.chipTextToday}>LIVE</Text>
      </View>
    ) : (
      <Text style={styles.countdown}>{countdown}</Text>
    );

    if (imminent) {
      return (
        <Animated.View key={`presale-${presale.id}`} entering={tearIn(Math.min(index, 8) * durations.stagger)}>
          <View style={styles.imminentCard}>
            <SpringPressable
              haptic="light"
              onPress={() => router.push(`/presales/${presale.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${presale.artistName} presale, ${presaleDateTime(presale.presaleStart)}`}
              style={styles.imminentTop}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {presale.artistName}
                  {presale.tourName ? ` — ${presale.tourName}` : ''}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {presale.venueName}
                  {presale.venueCity ? ` · ${presale.venueCity}` : ''}
                </Text>
                <Text style={styles.presaleMono} numberOfLines={1}>
                  {presaleDateTime(presale.presaleStart)}
                </Text>
              </View>
              {countdownChip}
            </SpringPressable>
            <View style={styles.imminentActions}>
              {presale.code ? (
                <SpringPressable
                  haptic="none"
                  onPress={() => void copyPresaleCode(presale)}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? 'Presale code copied' : `Copy presale code ${presale.code}`}
                  style={styles.codeChipLg}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color={copied ? tokens.colors.success : tokens.colors.fg}
                  />
                  <Text style={styles.codeChipTextLg} numberOfLines={1}>
                    {copied ? 'COPIED' : presale.code}
                  </Text>
                </SpringPressable>
              ) : null}
              <View style={{ flex: 1 }} />
              <PillButton
                title="Tickets"
                variant="primary"
                size="sm"
                springFeedback
                haptic="none"
                onPress={() => openTickets(presale)}
              />
            </View>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View key={`presale-${presale.id}`} entering={tearIn(Math.min(index, 8) * durations.stagger)}>
        <SpringPressable
          haptic="light"
          onPress={() => router.push(`/presales/${presale.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${presale.artistName} presale, ${presaleDateTime(presale.presaleStart)}`}
          style={styles.row}
        >
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {presale.artistName}
              {presale.tourName ? ` — ${presale.tourName}` : ''}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {presale.venueName}
              {presale.venueCity ? ` · ${presale.venueCity}` : ''}
            </Text>
            <Text style={styles.presaleMono} numberOfLines={1}>
              {presaleDateTime(presale.presaleStart)}
            </Text>
          </View>
          <View style={styles.presaleRight}>
            {countdownChip}
            {presale.code ? (
              <SpringPressable
                haptic="none"
                onPress={() => void copyPresaleCode(presale)}
                accessibilityRole="button"
                accessibilityLabel={copied ? 'Presale code copied' : `Copy presale code ${presale.code}`}
                style={styles.codeChip}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={11}
                  color={copied ? tokens.colors.success : tokens.colors.mute}
                />
                <Text style={styles.codeChipText} numberOfLines={1}>
                  {copied ? 'COPIED' : presale.code}
                </Text>
              </SpringPressable>
            ) : null}
          </View>
        </SpringPressable>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={52} height={52} borderRadius={tokens.radius.md} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="60%" height={14} borderRadius={7} />
              <Skeleton width="42%" height={11} borderRadius={6} />
            </View>
            <Skeleton width={58} height={24} borderRadius={tokens.radius.sm} />
          </View>
        ))}
      </View>
    );
  }

  if (error && total === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={40} color={tokens.colors.muteSoft} />
        <Text style={styles.emptyTitle}>Couldn&apos;t load your plans</Text>
        <Text style={styles.emptyBody}>{error}</Text>
      </View>
    );
  }

  if (total === 0 && weekPresales.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="calendar-clear-outline" size={40} color={tokens.colors.muteSoft} />
        <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
        <Text style={styles.emptyBody}>
          Grab a ticket, mark a show you&apos;re interested in, or follow artists — presales and countdowns land here.
        </Text>
        <PillButton
          title="Explore shows"
          size="lg"
          springFeedback
          haptic="light"
          onPress={() => router.push('/(tabs)/explore')}
        />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>Presales this week</Text>
        <SpringPressable
          haptic="light"
          onPress={() => router.push('/presales')}
          accessibilityRole="button"
          accessibilityLabel="Presale calendar"
        >
          <Text style={styles.calendarLink}>CALENDAR</Text>
        </SpringPressable>
      </View>
      {weekPresales.length > 0 ? (
        weekPresales.map((presale, i) => renderPresaleRow(presale, i))
      ) : (
        <Text style={[styles.emptyBody, { paddingHorizontal: 20 }]}>No presales in the next 7 days.</Text>
      )}
      {ticketed.length > 0 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Ticketed</Text>
          </View>
          {ticketed.map((row, i) => renderTicketedStub(row, weekPresales.length + i))}
        </>
      ) : null}
      {interested.length > 0 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Interested</Text>
          </View>
          {interested.map((row, i) => renderRow(row, weekPresales.length + ticketed.length + i))}
        </>
      ) : null}
    </View>
  );
}
