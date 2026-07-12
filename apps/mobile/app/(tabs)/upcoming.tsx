// Upcoming — your ticketed shows and the ones you're circling.
//
// Data comes from the existing concert-life endpoint (tickets + tracked
// events + presale alerts). Countdown chips are mono; TODAY inverts to
// ink. Empty state hands off to Explore.

import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../../components/ui/PillButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useConcertLife } from '../../hooks/useConcertLife';
import { durations } from '../../lib/motion';
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
  if (days === 1) return '1 DAY';
  if (days < 60) return `${days} DAYS`;
  const months = Math.round(days / 30);
  return `${months} MO`;
}

function formatShowDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

export default function UpcomingScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      paddingBottom: t.density.gap,
    },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6, color: t.colors.fg },
    count: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    scrollContent: { paddingBottom: 120 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: t.colors.mute,
      paddingHorizontal: t.density.pad,
      marginTop: 14,
      marginBottom: 6,
    },
    row: {
      minHeight: t.density.rowH,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.pad,
      paddingVertical: 8,
    },
    rowImage: {
      width: 52,
      height: 52,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    rowImageFallback: { alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: t.colors.text },
    rowMeta: { fontSize: 13, color: t.colors.mute },
    chip: {
      minWidth: 58,
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
    chipToday: { backgroundColor: t.colors.inverseBg },
    chipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.text,
    },
    chipTextToday: { color: t.colors.inverseFg },
    empty: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: t.density.gap,
      paddingBottom: 80,
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

  const { data, loading, refreshing, refresh, error } = useConcertLife();

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

  const renderRow = (row: UpcomingRow, index: number) => {
    const isToday = row.kind === 'ticketed' && daysUntil(row.date) === 0;
    return (
      <Animated.View key={`${row.kind}-${row.id}`} entering={FadeInDown.delay(Math.min(index, 8) * durations.stagger).duration(240)}>
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
          {row.imageUrl ? (
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
          )}
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {row.artistName}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {row.venueName}
              {row.venueCity ? ` · ${row.venueCity}` : ''} · {formatShowDate(row.date)}
            </Text>
          </View>
          <View style={[styles.chip, isToday && styles.chipToday]}>
            <Text style={[styles.chipText, isToday && styles.chipTextToday]}>
              {countdownLabel(row.date)}
            </Text>
          </View>
        </SpringPressable>
      </Animated.View>
    );
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View>
        {[0, 1, 2, 3, 4].map((i) => (
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
  } else if (error && total === 0) {
    body = (
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={40} color={tokens.colors.muteSoft} />
        <Text style={styles.emptyTitle}>Couldn&apos;t load your plans</Text>
        <Text style={styles.emptyBody}>{error}</Text>
        <PillButton title="Try again" springFeedback haptic="light" onPress={refresh} />
      </View>
    );
  } else if (total === 0) {
    body = (
      <View style={styles.empty}>
        <Ionicons name="calendar-clear-outline" size={40} color={tokens.colors.muteSoft} />
        <Text style={styles.emptyTitle}>Nothing planned</Text>
        <Text style={styles.emptyBody}>
          When you grab a ticket or mark a show you&apos;re interested in, it lands here with a countdown.
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
  } else {
    body = (
      <>
        {ticketed.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Ticketed</Text>
            {ticketed.map((row, i) => renderRow(row, i))}
          </>
        ) : null}
        {interested.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Interested</Text>
            {interested.map((row, i) => renderRow(row, ticketed.length + i))}
          </>
        ) : null}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming</Text>
        {total > 0 ? (
          <Text style={styles.count}>
            {total} {total === 1 ? 'SHOW' : 'SHOWS'}
          </Text>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, total === 0 && !loading ? { flexGrow: 1 } : null]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
      >
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}
