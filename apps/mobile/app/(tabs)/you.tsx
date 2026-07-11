// app/(tabs)/you.tsx — THE TIMELINE. Your live-events life on one scroll:
// profile header (pinned) → FUTURE plans → brand-gradient TODAY divider →
// PAST months, newest first. Cards float (settle to full scale/opacity as
// they approach the viewport center — see components/timeline/FloatCard).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getUserTimeline, type TimelineEntry, type TimelineMonth, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { getUserStats } from '../../lib/api/profile';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import type { ProfileStats } from '../../types/profile';

import { CompactLogRow } from '../../components/timeline/CompactLogRow';
import { FloatCard } from '../../components/timeline/FloatCard';
import { MemoryCard } from '../../components/timeline/MemoryCard';
import { MonthMarker } from '../../components/timeline/MonthMarker';
import { PlanCard } from '../../components/timeline/PlanCard';
import { TimelineHeader } from '../../components/timeline/TimelineHeader';
import { TodayDivider } from '../../components/timeline/TodayDivider';
import { monthLabel } from '../../components/timeline/format';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';

const PAGE_SIZE = 30;
// Rows past this index skip the entrance stagger (they mount mid-scroll).
const STAGGER_CUTOFF = 12;

// ─── Flattened list rows ───────────────────────────────────────────

type Row =
  | { kind: 'label'; key: string; text: string }
  | { kind: 'plan'; key: string; item: TimelineUpcomingItem }
  | { kind: 'today'; key: string }
  | { kind: 'month'; key: string; label: string }
  | { kind: 'entry'; key: string; entry: TimelineEntry }
  | { kind: 'emptyPast'; key: string };

/** Append a page of months, merging the boundary month when it spans pages. */
function mergeMonths(prev: TimelineMonth[], next: TimelineMonth[]): TimelineMonth[] {
  if (prev.length === 0) return next;
  const merged = prev.map((m) => ({ ...m, entries: [...m.entries] }));
  for (const month of next) {
    const last = merged[merged.length - 1];
    if (last && last.key === month.key) {
      last.entries.push(...month.entries);
    } else {
      merged.push({ ...month, entries: [...month.entries] });
    }
  }
  return merged;
}

// ─── Shimmer (themed skeleton block) ───────────────────────────────

function ShimmerBlock({ height, radius, style }: { height: number; radius?: number; style?: ViewStyle }) {
  const { tokens } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);

  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.8]),
  }));

  return (
    <Animated.View
      style={[
        { height, borderRadius: radius ?? tokens.radius.md, backgroundColor: tokens.colors.card2 },
        pulse,
        style,
      ]}
    />
  );
}

function TimelineSkeleton() {
  const { tokens } = useTheme();
  return (
    <View style={{ paddingHorizontal: tokens.density.pad, paddingTop: 16, gap: tokens.density.gap }}>
      <ShimmerBlock height={12} radius={6} style={{ width: 88 }} />
      <ShimmerBlock height={74} radius={tokens.radius.lg} />
      <ShimmerBlock height={2} radius={1} style={{ marginVertical: 10 }} />
      <ShimmerBlock height={12} radius={6} style={{ width: 72 }} />
      <ShimmerBlock height={248} radius={tokens.radius.lg} />
      <ShimmerBlock height={68} radius={tokens.radius.lg} />
      <ShimmerBlock height={68} radius={tokens.radius.lg} />
    </View>
  );
}

// ─── Empty states ──────────────────────────────────────────────────

function BrandMark({ size = 44 }: { size?: number }) {
  const { tokens } = useTheme();
  // The brand mark — a sanctioned use of the reserved brand gradient.
  return (
    <LinearGradient
      colors={tokens.gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

function EmptyTimeline({ onLog }: { onLog: () => void }) {
  const styles = useThemedStyles((t) => ({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.density.pad * 2,
      gap: t.density.gap,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: t.colors.fg,
      textAlign: 'center',
      marginTop: 8,
    },
    sub: {
      fontSize: 14,
      fontWeight: '400',
      color: t.colors.mute,
      textAlign: 'center',
      marginBottom: 8,
    },
  }));

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.wrap}>
      <BrandMark />
      <Text style={styles.title}>Your live-events life starts here</Text>
      <Text style={styles.sub}>Log your first show — past shows count.</Text>
      <PillButton title="Log a show" variant="primary" size="lg" onPress={onLog} springFeedback haptic="light" />
    </Animated.View>
  );
}

function EmptyPastBlock({ onLog }: { onLog: () => void }) {
  const styles = useThemedStyles((t) => ({
    wrap: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: t.density.pad,
      gap: 6,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: t.colors.fg,
      textAlign: 'center',
    },
    sub: {
      fontSize: 13,
      fontWeight: '400',
      color: t.colors.mute,
      textAlign: 'center',
      marginBottom: 10,
    },
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>No past shows yet</Text>
      <Text style={styles.sub}>Log your first show — past shows count.</Text>
      <PillButton title="Log a show" variant="primary" onPress={onLog} springFeedback haptic="light" />
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────

export default function YouScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user, profile } = useSession();
  const userId = user?.id ?? null;

  const [upcoming, setUpcoming] = useState<TimelineUpcomingItem[]>([]);
  const [months, setMonths] = useState<TimelineMonth[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  // Scroll offset shared value — drives every FloatCard worklet.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const styles = useThemedStyles((t) => ({
    screen: {
      flex: 1,
      backgroundColor: t.colors.bg,
    },
    sectionLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2,
      color: t.colors.mute,
    },
    labelWrap: { marginBottom: 10 },
    planWrap: { marginBottom: 12 },
    todayWrap: { marginTop: 12, marginBottom: 22 },
    monthWrap: { marginTop: 6, marginBottom: 12 },
    entryWrap: { marginBottom: t.density.gap },
    footer: { paddingVertical: 20, alignItems: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  }));

  // ── Data ──────────────────────────────────────────────────────

  // First page + profile stats. Only mutates state on success, so a failed
  // pull-to-refresh never wipes an already-rendered timeline.
  const load = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      const [timeline, statsResult] = await Promise.allSettled([
        getUserTimeline(userId, { limit: PAGE_SIZE }),
        getUserStats(userId),
      ]);
      if (timeline.status === 'rejected') throw timeline.reason;

      setUpcoming(timeline.value.upcoming ?? []);
      setMonths(timeline.value.months ?? []);
      setNextCursor(timeline.value.nextCursor ?? null);
      // Stats are a nice-to-have for the header — degrade to "—" on failure.
      setStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
      setErrorMsg(null);
      return true;
    } catch (e) {
      setErrorMsg(getErrorMessage(e));
      return false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setStatus('loading');
    void load().then((ok) => {
      if (alive) setStatus(ok ? 'ready' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [userId, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const ok = await load();
    if (ok) setStatus('ready');
    setRefreshing(false);
  }, [load]);

  const retry = useCallback(() => {
    setStatus('loading');
    void load().then((ok) => setStatus(ok ? 'ready' : 'error'));
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!userId || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getUserTimeline(userId, { cursor: nextCursor, limit: PAGE_SIZE });
      setMonths((prev) => mergeMonths(prev, page.months ?? []));
      setNextCursor(page.nextCursor ?? null);
    } catch {
      // Keep the cursor — the next end-reach retries.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userId, nextCursor]);

  // ── Derived ───────────────────────────────────────────────────

  // Average score across every loaded entry (header stat; "—" until scored).
  const avgScore = useMemo(() => {
    const scores = months
      .flatMap((m) => m.entries)
      .map((e) => e.score)
      .filter((s): s is number => typeof s === 'number');
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }, [months]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (upcoming.length > 0) {
      out.push({ kind: 'label', key: 'upcoming-label', text: 'UPCOMING' });
      // API returns ascending; reverse so the furthest-out plan is at the top
      // and the next show sits right above TODAY.
      for (let i = upcoming.length - 1; i >= 0; i--) {
        const item = upcoming[i]!;
        out.push({ kind: 'plan', key: `plan-${item.type}-${item.id}`, item });
      }
    }
    out.push({ kind: 'today', key: 'today' });
    if (months.length === 0) {
      out.push({ kind: 'emptyPast', key: 'empty-past' });
    } else {
      for (const month of months) {
        out.push({ kind: 'month', key: `month-${month.key}`, label: monthLabel(month.key) });
        for (const entry of month.entries) {
          out.push({ kind: 'entry', key: `log-${entry.logId}`, entry });
        }
      }
    }
    return out;
  }, [upcoming, months]);

  // ── Navigation ────────────────────────────────────────────────

  const openLog = useCallback(
    (logId: string) => router.push({ pathname: '/log/[id]', params: { id: logId } }),
    [router],
  );
  const openEvent = useCallback(
    (eventId: string) => router.push({ pathname: '/event/[eventId]', params: { eventId } }),
    [router],
  );
  const openLogFlow = useCallback(() => router.push('/log/search'), [router]);
  const openSettings = useCallback(() => router.push('/settings'), [router]);
  const openEditProfile = useCallback(() => router.push('/edit-profile'), [router]);

  // ── Rows ──────────────────────────────────────────────────────

  const renderRow = useCallback(
    ({ item, index }: ListRenderItemInfo<Row>) => {
      const entering = FadeInDown.duration(300).delay(
        index < STAGGER_CUTOFF ? index * durations.stagger : 0,
      );

      switch (item.kind) {
        case 'label':
          return (
            <Animated.View entering={entering} style={styles.labelWrap}>
              <Text style={styles.sectionLabel}>{item.text}</Text>
            </Animated.View>
          );
        case 'plan':
          return (
            <Animated.View entering={entering} style={styles.planWrap}>
              <FloatCard scrollY={scrollY}>
                <PlanCard item={item.item} onPress={() => openEvent(item.item.event.id)} />
              </FloatCard>
            </Animated.View>
          );
        case 'today':
          return (
            <Animated.View entering={entering} style={styles.todayWrap}>
              <TodayDivider />
            </Animated.View>
          );
        case 'month':
          return (
            <Animated.View entering={entering} style={styles.monthWrap}>
              <MonthMarker label={item.label} />
            </Animated.View>
          );
        case 'entry': {
          const isMemory = item.entry.sharedAt !== null && item.entry.photos.length > 0;
          return (
            <Animated.View entering={entering} style={styles.entryWrap}>
              <FloatCard scrollY={scrollY}>
                {isMemory ? (
                  <MemoryCard entry={item.entry} onPress={() => openLog(item.entry.logId)} />
                ) : (
                  <CompactLogRow entry={item.entry} onPress={() => openLog(item.entry.logId)} />
                )}
              </FloatCard>
            </Animated.View>
          );
        }
        case 'emptyPast':
          return (
            <Animated.View entering={entering}>
              <EmptyPastBlock onLog={openLogFlow} />
            </Animated.View>
          );
      }
    },
    [styles, scrollY, openEvent, openLog, openLogFlow],
  );

  // ── Render ────────────────────────────────────────────────────

  const header = (
    <TimelineHeader
      displayName={profile?.displayName ?? profile?.username ?? 'You'}
      username={profile?.username ?? null}
      city={profile?.city ?? null}
      avatarUrl={profile?.avatarUrl ?? null}
      stats={{
        shows: stats?.shows ?? null,
        artists: stats?.artists ?? null,
        venues: stats?.venues ?? null,
        avgScore,
      }}
      onSettings={openSettings}
      onEdit={openEditProfile}
    />
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      tintColor={tokens.colors.mute}
      colors={[tokens.colors.accent]}
      progressBackgroundColor={tokens.colors.card2}
    />
  );

  if (!userId) {
    // Tabs layout redirects unauthenticated users; brief settle state only.
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        <TimelineSkeleton />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load your timeline"
            message={errorMsg ?? undefined}
            onRetry={retry}
          />
        </View>
      </SafeAreaView>
    );
  }

  // EMPTY STATE — brand-new users land here.
  if (upcoming.length === 0 && months.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          <EmptyTimeline onLog={openLogFlow} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      <Animated.FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(row: Row) => row.key}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        contentContainerStyle={{
          paddingHorizontal: tokens.density.pad,
          paddingTop: 16,
          paddingBottom: 48,
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={tokens.colors.mute} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
