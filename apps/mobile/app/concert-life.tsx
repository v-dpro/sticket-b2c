import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SpringPressable } from '../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../lib/theme-context';

type Tokens = ReturnType<typeof useTheme>['tokens'];
import { useUserLogs } from '../hooks/useUserLogs';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import type { LogEntry } from '../types/profile';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function isFutureDate(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '');
}

type GroupedByYear = {
  year: number;
  showCount: number;
  months: { month: number; logs: LogEntry[] }[];
};

function groupLogsByYearMonth(logs: LogEntry[]): GroupedByYear[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime()
  );

  const yearMap = new Map<number, Map<number, LogEntry[]>>();

  for (const log of sorted) {
    const d = new Date(log.event.date);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!yearMap.has(y)) yearMap.set(y, new Map());
    const mMap = yearMap.get(y)!;
    if (!mMap.has(m)) mMap.set(m, []);
    mMap.get(m)!.push(log);
  }

  const result: GroupedByYear[] = [];
  const sortedYears = [...yearMap.keys()].sort((a, b) => b - a);

  for (const year of sortedYears) {
    const mMap = yearMap.get(year)!;
    const sortedMonths = [...mMap.keys()].sort((a, b) => b - a);
    const months = sortedMonths.map((m) => ({ month: m, logs: mMap.get(m)! }));
    const showCount = months.reduce((acc, mg) => acc + mg.logs.length, 0);
    result.push({ year, showCount, months });
  }

  return result;
}

type Styles = ReturnType<typeof useTimelineStyles>;

function useTimelineStyles() {
  return useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 120 },

    // Header
    header: { paddingTop: 16, paddingHorizontal: t.density.pad, paddingBottom: 8 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 2,
      color: t.colors.mute,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38, color: t.colors.fg },

    // Stats strip
    statsStrip: {
      marginTop: 12,
      marginHorizontal: t.density.pad,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      borderRadius: t.radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statCell: { flex: 1, alignItems: 'center' },
    statNumber: { fontFamily: t.fontFamilies.monoBold, fontSize: 30, fontWeight: '700', letterSpacing: -1, color: t.colors.fg },
    statLabel: { fontFamily: t.fontFamilies.mono, fontSize: 10, fontWeight: '500', letterSpacing: 1.5, marginTop: 4, color: t.colors.mute },
    statsDivider: { width: 1, height: 36, backgroundColor: t.colors.line },

    // View toggle
    toggleContainer: { marginTop: 16, marginHorizontal: t.density.pad },
    toggleTrack: {
      flexDirection: 'row',
      backgroundColor: t.colors.card2,
      borderRadius: 999,
      padding: 3,
    },
    toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 999 },
    toggleActive: { backgroundColor: t.colors.inverseBg },
    toggleText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    toggleTextActive: { color: t.colors.inverseFg },

    // Loading / Empty
    loadingState: { paddingTop: 60, alignItems: 'center' },
    loadingText: { color: t.colors.mute, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.colors.fg, marginTop: t.spacing.md, marginBottom: t.spacing.sm },
    emptyText: { fontSize: 14, color: t.colors.mute, textAlign: 'center', paddingHorizontal: t.spacing.lg },

    // Timeline shared
    timeline: { marginTop: 20, paddingHorizontal: t.density.pad },

    // ── Story view ──
    yearDivider: { marginTop: 24, marginBottom: 16 },
    yearRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
    yearText: { fontSize: 48, fontWeight: '800', letterSpacing: -2, color: t.colors.fg },
    yearCount: { fontFamily: t.fontFamilies.mono, fontSize: 10, fontWeight: '500', letterSpacing: 1.5, color: t.colors.muteSoft, textTransform: 'uppercase' },
    yearLine: { height: 1, backgroundColor: t.colors.hairline, marginTop: 8 },

    monthHeader: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 2.2,
      color: t.colors.mute,
      textTransform: 'uppercase',
      marginTop: 20,
      marginBottom: 12,
    },

    storyRow: { flexDirection: 'row', marginBottom: 16 },
    storyLeft: { width: 52, alignItems: 'center', paddingTop: 4 },
    storyWeekday: { fontFamily: t.fontFamilies.mono, fontSize: 9, fontWeight: '500', letterSpacing: 1, color: t.colors.muteSoft, textTransform: 'uppercase' },
    storyDay: { fontSize: 32, fontWeight: '800', letterSpacing: -1, color: t.colors.fg, lineHeight: 38 },
    storyRail: { flex: 1, width: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: t.colors.hairline, marginTop: 4 },

    storyCard: {
      flex: 1,
      marginLeft: 8,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    storyCover: { width: '100%', aspectRatio: 16 / 10, position: 'relative' },
    storyCoverImage: { ...StyleSheet_absoluteFill, width: '100%', height: '100%' },
    storyCoverFallback: { ...StyleSheet_absoluteFill, backgroundColor: t.colors.card2 },
    storyCoverGradient: { ...StyleSheet_absoluteFill },
    storyArtistOverlay: {
      position: 'absolute',
      bottom: 10,
      left: 12,
      right: 12,
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    upcomingBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: t.colors.inverseBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    upcomingBadgeText: { fontFamily: t.fontFamilies.mono, fontSize: 9, fontWeight: '700', letterSpacing: 1, color: t.colors.inverseFg, textTransform: 'uppercase' },
    ratingBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    ratingBadgeText: { fontSize: 12, color: '#FFFFFF' },

    storyMeta: { padding: 12, gap: 4 },
    storyVenueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    storyVenueText: { fontSize: 12, color: t.colors.mute, flex: 1 },
    storyTour: { fontFamily: t.fontFamilies.mono, fontSize: 10, color: t.colors.muteSoft, letterSpacing: 0.5 },
    storyReview: { fontSize: 13, color: t.colors.textSoft, lineHeight: 18, marginTop: 2 },

    // ── Compact view ──
    compactYearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 },
    compactYearDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.fg },
    compactYearText: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    compactMonthLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '500',
      letterSpacing: 1.5,
      color: t.colors.muteSoft,
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 6,
      marginLeft: 16,
    },
    compactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 10, position: 'relative' },
    compactRail: { position: 'absolute', left: 20, top: 42, bottom: -8, width: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: t.colors.hairline },
    compactDay: { fontFamily: t.fontFamilies.mono, fontSize: 13, fontWeight: '600', color: t.colors.fg, width: 28, textAlign: 'center' },
    compactArtwork: { width: 34, height: 34, borderRadius: 6, overflow: 'hidden', backgroundColor: t.colors.card2 },
    compactArtworkImage: { width: 34, height: 34 },
    compactArtworkFallback: { width: 34, height: 34, backgroundColor: t.colors.card2 },
    compactInfo: { flex: 1 },
    compactArtist: { fontSize: 13.5, fontWeight: '700', color: t.colors.fg },
    compactVenue: { fontSize: 11, color: t.colors.muteSoft, marginTop: 1 },
    compactStars: { fontSize: 12, color: t.colors.fg },
    soonBadge: { backgroundColor: t.colors.inverseBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    soonBadgeText: { fontFamily: t.fontFamilies.mono, fontSize: 9, fontWeight: '700', letterSpacing: 1, color: t.colors.inverseFg, textTransform: 'uppercase' },

    // ── Footer ──
    footer: {
      marginTop: 32,
      marginHorizontal: t.density.pad,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      borderStyle: 'dashed',
      borderRadius: t.radius.md,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    footerTitle: { fontSize: 20, fontWeight: '700', color: t.colors.textSoft, marginBottom: 10 },
    footerCta: { fontFamily: t.fontFamilies.mono, fontSize: 10, fontWeight: '500', letterSpacing: 1.5, color: t.colors.mute, textTransform: 'uppercase' },
  }));
}

// Local absolute-fill helper (avoid importing StyleSheet just for this).
const StyleSheet_absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

type ViewMode = 'story' | 'compact';

export default function ConcertLifeScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const s = useTimelineStyles();
  const { user } = useSession();
  const userId = user?.id ?? '';
  const { profile } = useProfile();
  const { logs, loading, hasMore, loadMore, refresh } = useUserLogs(userId);
  const [viewMode, setViewMode] = useState<ViewMode>('story');
  const [refreshing, setRefreshing] = useState(false);

  const stats = profile?.stats;
  const upcomingCount = useMemo(
    () => logs.filter((l) => isFutureDate(l.event.date)).length,
    [logs]
  );

  const grouped = useMemo(() => groupLogsByYearMonth(logs), [logs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleLogPress = useCallback(
    (log: LogEntry) => {
      router.push(`/log/${log.id}` as any);
    },
    [router]
  );

  const handleScroll = useCallback(
    (e: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
        if (hasMore && !loading) loadMore();
      }
    },
    [hasMore, loading, loadMore]
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tokens.colors.mute} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <SpringPressable onPress={() => router.back()} haptic="light" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Back" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
            <Ionicons name="chevron-back" size={24} color={tokens.colors.fg} />
          </SpringPressable>
          <Text style={s.eyebrow}>CONCERT LIFE</Text>
          <Text style={s.title}>Your year in shows</Text>
        </View>

        {/* ── Stats strip ── */}
        <View style={s.statsStrip}>
          <View style={s.statsRow}>
            <StatCell value={stats?.shows ?? 0} label="SHOWS" s={s} />
            <View style={s.statsDivider} />
            <StatCell value={upcomingCount} label="UPCOMING" s={s} />
            <View style={s.statsDivider} />
            <StatCell value={stats?.artists ?? 0} label="ARTISTS" s={s} />
            <View style={s.statsDivider} />
            <StatCell value={stats?.venues ?? 0} label="VENUES" s={s} />
          </View>
        </View>

        {/* ── View toggle ── */}
        <View style={s.toggleContainer}>
          <View style={s.toggleTrack}>
            <SpringPressable
              style={[s.toggleOption, viewMode === 'story' && s.toggleActive]}
              onPress={() => setViewMode('story')}
              haptic="light"
            >
              <Text style={[s.toggleText, viewMode === 'story' && s.toggleTextActive]}>STORY</Text>
            </SpringPressable>
            <SpringPressable
              style={[s.toggleOption, viewMode === 'compact' && s.toggleActive]}
              onPress={() => setViewMode('compact')}
              haptic="light"
            >
              <Text style={[s.toggleText, viewMode === 'compact' && s.toggleTextActive]}>COMPACT</Text>
            </SpringPressable>
          </View>
        </View>

        {/* ── Timeline ── */}
        {loading && logs.length === 0 ? (
          <View style={s.loadingState}>
            <Text style={s.loadingText}>Loading...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="musical-notes-outline" size={48} color={tokens.colors.muteSoft} />
            <Text style={s.emptyTitle}>No shows logged yet</Text>
            <Text style={s.emptyText}>Start logging concerts to build your timeline</Text>
          </View>
        ) : viewMode === 'story' ? (
          <StoryTimeline grouped={grouped} onLogPress={handleLogPress} s={s} tokens={tokens} />
        ) : (
          <CompactTimeline grouped={grouped} onLogPress={handleLogPress} s={s} />
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerTitle}>This is where it starts.</Text>
          <SpringPressable haptic="light">
            <Text style={s.footerCta}>LOG AN OLDER SHOW {'→'}</Text>
          </SpringPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stat Cell ─────────────────────────────────────────────────────────────────

function StatCell({ value, label, s }: { value: number; label: string; s: Styles }) {
  return (
    <View style={s.statCell}>
      <Text style={s.statNumber}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Story Timeline ────────────────────────────────────────────────────────────

function StoryTimeline({
  grouped,
  onLogPress,
  s,
  tokens,
}: {
  grouped: GroupedByYear[];
  onLogPress: (log: LogEntry) => void;
  s: Styles;
  tokens: Tokens;
}) {
  return (
    <View style={s.timeline}>
      {grouped.map((yearGroup) => (
        <View key={yearGroup.year}>
          {/* Year divider */}
          <View style={s.yearDivider}>
            <View style={s.yearRow}>
              <Text style={s.yearText}>{yearGroup.year}</Text>
              <Text style={s.yearCount}>{yearGroup.showCount} SHOWS</Text>
            </View>
            <View style={s.yearLine} />
          </View>

          {yearGroup.months.map((monthGroup) => (
            <View key={monthGroup.month}>
              {/* Month header */}
              <Text style={s.monthHeader}>
                {'· '}{MONTHS[monthGroup.month].toUpperCase()}
              </Text>

              {monthGroup.logs.map((log, idx) => {
                const d = new Date(log.event.date);
                const weekday = WEEKDAYS[d.getDay()];
                const dayNum = d.getDate();
                const upcoming = isFutureDate(log.event.date);
                const photo = log.photos?.[0]?.photoUrl || log.event.artist.imageUrl;
                const isLast = idx === monthGroup.logs.length - 1;

                return (
                  <SpringPressable
                    key={log.id}
                    style={s.storyRow}
                    onPress={() => onLogPress(log)}
                    haptic="light"
                  >
                    {/* Left column: date + rail */}
                    <View style={s.storyLeft}>
                      <Text style={s.storyWeekday}>{weekday}</Text>
                      <Text style={s.storyDay}>{dayNum}</Text>
                      {!isLast && <View style={s.storyRail} />}
                    </View>

                    {/* Right column: card */}
                    <View style={s.storyCard}>
                      {/* Cover photo */}
                      <View style={s.storyCover}>
                        {photo ? (
                          <Image source={{ uri: photo }} style={s.storyCoverImage} contentFit="cover" />
                        ) : (
                          <View style={s.storyCoverFallback} />
                        )}
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.storyCoverGradient} />
                        <Text style={s.storyArtistOverlay} numberOfLines={1}>
                          {log.event.artist.name}
                        </Text>

                        {/* Upcoming badge */}
                        {upcoming && (
                          <View style={s.upcomingBadge}>
                            <Text style={s.upcomingBadgeText}>UPCOMING</Text>
                          </View>
                        )}

                        {/* Rating badge */}
                        {log.rating != null && log.rating > 0 && (
                          <View style={s.ratingBadge}>
                            <Text style={s.ratingBadgeText}>{renderStars(log.rating)}</Text>
                          </View>
                        )}
                      </View>

                      {/* Meta */}
                      <View style={s.storyMeta}>
                        <View style={s.storyVenueRow}>
                          <Ionicons name="location-sharp" size={11} color={tokens.colors.mute} />
                          <Text style={s.storyVenueText} numberOfLines={1}>
                            {log.event.venue.name}{'·'}{log.event.venue.city}
                          </Text>
                        </View>
                        {log.event.name && log.event.name !== log.event.artist.name ? (
                          <Text style={s.storyTour} numberOfLines={1}>
                            {log.event.name}
                          </Text>
                        ) : null}
                        {log.note ? (
                          <Text style={s.storyReview} numberOfLines={2}>
                            {log.note}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </SpringPressable>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Compact Timeline ──────────────────────────────────────────────────────────

function CompactTimeline({
  grouped,
  onLogPress,
  s,
}: {
  grouped: GroupedByYear[];
  onLogPress: (log: LogEntry) => void;
  s: Styles;
}) {
  return (
    <View style={s.timeline}>
      {grouped.map((yearGroup) => (
        <View key={yearGroup.year}>
          {/* Year marker */}
          <View style={s.compactYearRow}>
            <View style={s.compactYearDot} />
            <Text style={s.compactYearText}>{yearGroup.year}</Text>
          </View>

          {yearGroup.months.map((monthGroup) => (
            <View key={monthGroup.month}>
              {/* Month label */}
              <Text style={s.compactMonthLabel}>{MONTHS[monthGroup.month].toUpperCase()}</Text>

              {monthGroup.logs.map((log, idx) => {
                const d = new Date(log.event.date);
                const dayNum = d.getDate();
                const upcoming = isFutureDate(log.event.date);
                const artwork = log.event.artist.imageUrl;
                const isLast =
                  idx === monthGroup.logs.length - 1 &&
                  monthGroup === yearGroup.months[yearGroup.months.length - 1];

                return (
                  <SpringPressable
                    key={log.id}
                    style={s.compactRow}
                    onPress={() => onLogPress(log)}
                    haptic="light"
                  >
                    {/* Rail */}
                    {!isLast && <View style={s.compactRail} />}

                    {/* Day */}
                    <Text style={s.compactDay}>{dayNum}</Text>

                    {/* Artwork */}
                    <View style={s.compactArtwork}>
                      {artwork ? (
                        <Image source={{ uri: artwork }} style={s.compactArtworkImage} contentFit="cover" />
                      ) : (
                        <View style={s.compactArtworkFallback} />
                      )}
                    </View>

                    {/* Info */}
                    <View style={s.compactInfo}>
                      <Text style={s.compactArtist} numberOfLines={1}>
                        {log.event.artist.name}
                      </Text>
                      <Text style={s.compactVenue} numberOfLines={1}>
                        {log.event.venue.name}
                      </Text>
                    </View>

                    {/* Rating or SOON */}
                    {upcoming ? (
                      <View style={s.soonBadge}>
                        <Text style={s.soonBadgeText}>SOON</Text>
                      </View>
                    ) : log.rating != null && log.rating > 0 ? (
                      <Text style={s.compactStars}>{renderStars(log.rating)}</Text>
                    ) : null}
                  </SpringPressable>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
