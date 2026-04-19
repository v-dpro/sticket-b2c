import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, accentSets, radius, fonts, spacing } from '../../../lib/theme';
import { fontFamilies } from '../../../lib/fonts';
import { useUserLogs } from '../../../hooks/useUserLogs';
import { useSession } from '../../../hooks/useSession';
import { useProfile } from '../../../hooks/useProfile';
import type { LogEntry } from '../../../types/profile';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const monoFont = fontFamilies.mono;
const displayFont = fontFamilies.display;

function isFutureDate(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '\u2605'.repeat(full) + (half ? '\u00BD' : '');
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

// ─── Main Screen ───────────────────────────────────────────────────────────────

type ViewMode = 'story' | 'compact';

export default function ConcertLifeScreen() {
  const router = useRouter();
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brandCyan}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>CONCERT LIFE</Text>
          <Text style={s.title}>Your year in shows</Text>
        </View>

        {/* ── Stats strip ── */}
        <View style={s.statsStrip}>
          <View style={s.statsRow}>
            <StatCell value={stats?.shows ?? 0} label="SHOWS" color={colors.textHi} />
            <View style={s.statsDivider} />
            <StatCell value={upcomingCount} label="UPCOMING" color={accentSets.lime.hex} />
            <View style={s.statsDivider} />
            <StatCell value={stats?.artists ?? 0} label="ARTISTS" color={accentSets.pink.hex} />
            <View style={s.statsDivider} />
            <StatCell value={stats?.venues ?? 0} label="VENUES" color={accentSets.cyan.hex} />
          </View>
        </View>

        {/* ── View toggle ── */}
        <View style={s.toggleContainer}>
          <View style={s.toggleTrack}>
            <TouchableOpacity
              style={[s.toggleOption, viewMode === 'story' && s.toggleActive]}
              onPress={() => setViewMode('story')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, viewMode === 'story' && s.toggleTextActive]}>
                STORY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleOption, viewMode === 'compact' && s.toggleActive]}
              onPress={() => setViewMode('compact')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, viewMode === 'compact' && s.toggleTextActive]}>
                COMPACT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Timeline ── */}
        {loading && logs.length === 0 ? (
          <View style={s.loadingState}>
            <Text style={s.loadingText}>Loading...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textLo} />
            <Text style={s.emptyTitle}>No shows logged yet</Text>
            <Text style={s.emptyText}>
              Start logging concerts to build your timeline
            </Text>
          </View>
        ) : viewMode === 'story' ? (
          <StoryTimeline grouped={grouped} onLogPress={handleLogPress} />
        ) : (
          <CompactTimeline grouped={grouped} onLogPress={handleLogPress} />
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerTitle}>This is where it starts.</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.footerCta}>LOG AN OLDER SHOW {'\u2192'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stat Cell ─────────────────────────────────────────────────────────────────

function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statNumber, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Story Timeline ────────────────────────────────────────────────────────────

function StoryTimeline({
  grouped,
  onLogPress,
}: {
  grouped: GroupedByYear[];
  onLogPress: (log: LogEntry) => void;
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
                  <TouchableOpacity
                    key={log.id}
                    style={s.storyRow}
                    onPress={() => onLogPress(log)}
                    activeOpacity={0.85}
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
                          <Image
                            source={{ uri: photo }}
                            style={s.storyCoverImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={s.storyCoverFallback} />
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.75)']}
                          style={s.storyCoverGradient}
                        />
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
                            <Text style={s.ratingBadgeText}>
                              {renderStars(log.rating)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Meta */}
                      <View style={s.storyMeta}>
                        <View style={s.storyVenueRow}>
                          <Ionicons name="location-sharp" size={11} color={colors.textMid} />
                          <Text style={s.storyVenueText} numberOfLines={1}>
                            {log.event.venue.name}{'\u00B7'}{log.event.venue.city}
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
                  </TouchableOpacity>
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
}: {
  grouped: GroupedByYear[];
  onLogPress: (log: LogEntry) => void;
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
              <Text style={s.compactMonthLabel}>
                {MONTHS[monthGroup.month].toUpperCase()}
              </Text>

              {monthGroup.logs.map((log, idx) => {
                const d = new Date(log.event.date);
                const dayNum = d.getDate();
                const upcoming = isFutureDate(log.event.date);
                const artwork = log.event.artist.imageUrl;
                const isLast =
                  idx === monthGroup.logs.length - 1 &&
                  monthGroup === yearGroup.months[yearGroup.months.length - 1];

                return (
                  <TouchableOpacity
                    key={log.id}
                    style={s.compactRow}
                    onPress={() => onLogPress(log)}
                    activeOpacity={0.85}
                  >
                    {/* Rail */}
                    {!isLast && <View style={s.compactRail} />}

                    {/* Day */}
                    <Text style={s.compactDay}>{dayNum}</Text>

                    {/* Artwork */}
                    <View style={s.compactArtwork}>
                      {artwork ? (
                        <Image
                          source={{ uri: artwork }}
                          style={s.compactArtworkImage}
                          resizeMode="cover"
                        />
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
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Header
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 2,
    color: accentSets.cyan.hex,
    marginBottom: 6,
  },
  title: {
    fontFamily: displayFont,
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: -0.8,
    lineHeight: 36 * 1.1,
    color: colors.textHi,
  },

  // Stats strip
  statsStrip: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: displayFont,
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: -1,
    color: colors.textHi,
  },
  statLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.hairline,
  },

  // View toggle
  toggleContainer: {
    marginTop: 16,
    marginHorizontal: 20,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    padding: 3,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
  toggleActive: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textLo,
  },
  toggleTextActive: {
    color: colors.textHi,
  },

  // Loading / Empty
  loadingState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMid,
    fontWeight: fonts.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: fonts.bold,
    color: colors.textHi,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fonts.bodySmall,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Timeline shared
  timeline: {
    marginTop: 20,
    paddingHorizontal: 20,
  },

  // ── Story view ──

  // Year divider
  yearDivider: {
    marginTop: 24,
    marginBottom: 16,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  yearText: {
    fontFamily: displayFont,
    fontSize: 56,
    letterSpacing: -2,
    color: colors.textHi,
  },
  yearCount: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: colors.textLo,
    textTransform: 'uppercase',
  },
  yearLine: {
    height: 1,
    backgroundColor: colors.hairline,
    marginTop: 8,
  },

  // Month header
  monthHeader: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    color: accentSets.cyan.hex,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 12,
  },

  // Story row
  storyRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  // Story left column (date + rail)
  storyLeft: {
    width: 52,
    alignItems: 'center',
    paddingTop: 4,
  },
  storyWeekday: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1,
    color: colors.textLo,
    textTransform: 'uppercase',
  },
  storyDay: {
    fontFamily: displayFont,
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: -1,
    color: colors.textHi,
    lineHeight: 40,
  },
  storyRail: {
    flex: 1,
    width: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.hairline,
    marginTop: 4,
  },

  // Story card
  storyCard: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  // Cover photo
  storyCover: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
  },
  storyCoverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  storyCoverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.elevated,
  },
  storyCoverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  storyArtistOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    fontSize: 26,
    fontWeight: fonts.bold,
    color: colors.textHi,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Upcoming badge
  upcomingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: accentSets.cyan.hex,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  upcomingBadgeText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.ink,
    textTransform: 'uppercase',
  },

  // Rating badge (frosted glass)
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    ...(Platform.OS === 'ios'
      ? {
          // iOS blur approximation via backdrop style
        }
      : {}),
  },
  ratingBadgeText: {
    fontSize: 12,
    color: colors.textHi,
  },

  // Story meta
  storyMeta: {
    padding: 12,
    gap: 4,
  },
  storyVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storyVenueText: {
    fontSize: 12,
    color: colors.textMid,
    flex: 1,
  },
  storyTour: {
    fontFamily: monoFont,
    fontSize: 10,
    color: colors.textLo,
    letterSpacing: 0.5,
  },
  storyReview: {
    fontSize: 13,
    color: colors.textMid,
    lineHeight: 18,
    marginTop: 2,
  },

  // ── Compact view ──

  compactYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  compactYearDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: accentSets.cyan.hex,
  },
  compactYearText: {
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: -0.5,
    color: colors.textHi,
  },

  compactMonthLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: colors.textLo,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 16,
  },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 10,
    position: 'relative',
  },
  compactRail: {
    position: 'absolute',
    left: 20,
    top: 42,
    bottom: -8,
    width: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  compactDay: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textHi,
    width: 28,
    textAlign: 'center',
  },

  compactArtwork: {
    width: 34,
    height: 34,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  compactArtworkImage: {
    width: 34,
    height: 34,
  },
  compactArtworkFallback: {
    width: 34,
    height: 34,
    backgroundColor: colors.elevated,
  },

  compactInfo: {
    flex: 1,
  },
  compactArtist: {
    fontSize: 13.5,
    fontWeight: fonts.bold,
    color: colors.textHi,
  },
  compactVenue: {
    fontSize: 11,
    color: colors.textLo,
    marginTop: 1,
  },

  compactStars: {
    fontSize: 12,
    color: colors.textHi,
  },

  soonBadge: {
    backgroundColor: accentSets.cyan.hex,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  soonBadgeText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.ink,
    textTransform: 'uppercase',
  },

  // ── Footer ──

  footer: {
    marginTop: 32,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerTitle: {
    fontFamily: displayFont,
    fontSize: 20,
    color: colors.textMid,
    marginBottom: 10,
  },
  footerCta: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: colors.textLo,
    textTransform: 'uppercase',
  },
});
