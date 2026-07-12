// app/(tabs)/you.tsx — THE TIMELINE, as a MEMORY CAROUSEL. Your live-events
// life on one scroll: profile header (pinned) → FUTURE plans → brand-gradient
// TODAY divider → PAST months, newest first. Memory cards are the carousel:
// the vertical list center-snaps each memory card to the viewport center
// (snapToOffsets computed from an onLayout height registry — see the
// "Carousel snap mechanics" block below), where FloatCard's strong curve
// makes the settled card dominant while neighbors recede (curve="memory";
// plan/compact/marker rows keep the gentle float and travel between snaps).
// Inside a card, extra photos of that memory page horizontally (MemoryCard).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type FlatList,
  type HostInstance,
  type ListRenderItemInfo,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getUserTimeline, type TimelineEntry, type TimelineMonth, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { getUserStats } from '../../lib/api/profile';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { durations, haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import type { ProfileStats } from '../../types/profile';

import { AgendaPin } from '../../components/agenda/AgendaPin';
import { CompactLogRow } from '../../components/timeline/CompactLogRow';
import { FloatCard } from '../../components/timeline/FloatCard';
import { MemoryCard } from '../../components/timeline/MemoryCard';
import { MonthMarker } from '../../components/timeline/MonthMarker';
import { PlanCard } from '../../components/timeline/PlanCard';
import { TimelineHeader } from '../../components/timeline/TimelineHeader';
import { TimelineMapView } from '../../components/timeline/TimelineMapView';
import { TimelineViewToggle, type TimelineViewMode } from '../../components/timeline/TimelineViewToggle';
import { TodayDivider } from '../../components/timeline/TodayDivider';
import { monthLabel } from '../../components/timeline/format';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { WrappedChip } from '../../components/wrapped/WrappedChip';

const PAGE_SIZE = 30;
// Rows past this index skip the entrance stagger (they mount mid-scroll).
const STAGGER_CUTOFF = 12;
// Map view backfills the rest of history when opened (it's only meaningful
// complete) — hard cap on how many extra pages it may pull.
const MAP_BACKFILL_MAX_PAGES = 10;
// List content paddingTop — the snap-offset walk must start from the same
// origin the contentContainerStyle uses.
const CONTENT_TOP_PAD = 16;
// A memory card's photo is 63% of its width (MemoryCard aspectRatio 100/63).
const MEMORY_ASPECT = 0.63;
// Momentum may only rest ON a snap offset (or in a free zone) — this is the
// match tolerance for deciding which, in px.
const SNAP_SETTLE_TOLERANCE = 8;

// ─── Flattened list rows ───────────────────────────────────────────

type Row =
  | { kind: 'label'; key: string; text: string }
  | { kind: 'plan'; key: string; item: TimelineUpcomingItem }
  | { kind: 'today'; key: string }
  | { kind: 'month'; key: string; label: string }
  | { kind: 'entry'; key: string; entry: TimelineEntry }
  | { kind: 'emptyPast'; key: string };

/** Shared + photographed ⇒ memory card (the carousel's snap targets). */
function isMemoryEntry(entry: TimelineEntry): boolean {
  return entry.sharedAt !== null && entry.photos.length > 0;
}

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
      {/* Memory card placeholder — full-bleed photo card (≈63% of width, radius 22). */}
      <ShimmerBlock height={220} radius={tokens.radius.xl} />
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

function EmptyTimeline({ onLog, onBackfill }: { onLog: () => void; onBackfill: () => void }) {
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
      {/* Résumé lane (A3): recognition-card backfill of past shows. */}
      <PillButton title="Add your past shows (2 min)" variant="ghost" size="lg" onPress={onBackfill} springFeedback />
    </Animated.View>
  );
}

function EmptyPastBlock({ onLog, onBackfill }: { onLog: () => void; onBackfill: () => void }) {
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
      {/* Résumé lane (A3): recognition-card backfill of past shows. */}
      <PillButton title="Add your past shows (2 min)" variant="ghost" onPress={onBackfill} springFeedback />
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

  // View mode — per-session only (deliberately not persisted).
  const [viewMode, setViewMode] = useState<TimelineViewMode>('scroll');
  const listRef = useRef<FlatList<Row>>(null);
  // Row key a map-marker tap wants the scroll view to land on.
  const pendingScrollKey = useRef<string | null>(null);
  // Pages pulled by the map's backfill loop (counts toward the hard cap).
  const mapBackfillPages = useRef(0);

  // ── Carousel snap mechanics ───────────────────────────────────
  // The flattened rows are variable-height, so per-row offsets are built
  // from an onLayout height registry: every row wrapper reports its height
  // (row spacing is PADDING on the wrapper — not margin — precisely so one
  // onLayout captures the row's full extent), and rows the virtualized list
  // hasn't mounted yet fall back to per-kind estimates (memory cards are
  // width-derived, so their "estimate" is exact). The snapOffsets memo
  // below walks the rows accumulating heights; each MEMORY row contributes
  // one offset that puts the card's center on the WINDOW's vertical center
  // — the same center FloatCard settles toward, so a snapped card rests at
  // full scale/opacity. Non-memory rows contribute no offset: they travel
  // between snaps.
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const rowHeights = useRef<Map<string, number>>(new Map());
  const layoutDirty = useRef(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  // Batch measurement arrivals into one recompute per frame.
  const onRowLayout = useCallback((key: string, height: number) => {
    const prev = rowHeights.current.get(key);
    if (prev !== undefined && Math.abs(prev - height) < 0.5) return;
    rowHeights.current.set(key, height);
    if (layoutDirty.current) return;
    layoutDirty.current = true;
    requestAnimationFrame(() => {
      layoutDirty.current = false;
      setLayoutVersion((v) => v + 1);
    });
  }, []);

  // Where the list viewport sits in the window (header + toggle bar live
  // above it) — needed to translate "window center" into a content offset.
  const listWrapRef = useRef<HostInstance>(null);
  const [listWindow, setListWindow] = useState<{ pageY: number; height: number } | null>(null);
  const onListWrapLayout = useCallback(() => {
    listWrapRef.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      setListWindow((prev) =>
        prev && Math.abs(prev.pageY - y) < 0.5 && Math.abs(prev.height - h) < 0.5
          ? prev
          : { pageY: y, height: h },
      );
    });
  }, []);
  const [contentHeight, setContentHeight] = useState(0);

  // Scroll offset shared value — drives every FloatCard worklet. Momentum
  // end hops to JS once per settle to fire the snap haptic.
  const scrollY = useSharedValue(0);
  // Which snap offset the list last settled on (null = free zone).
  const settledSnapIndex = useRef<number | null>(null);
  const snapOffsetsRef = useRef<number[]>([]);

  const onMomentumSettled = useCallback((settledY: number) => {
    const offsets = snapOffsetsRef.current;
    let index: number | null = null;
    for (let i = 0; i < offsets.length; i++) {
      if (Math.abs(offsets[i]! - settledY) <= SNAP_SETTLE_TOLERANCE) {
        index = i;
        break;
      }
    }
    if (index !== null && index !== settledSnapIndex.current) {
      haptics.light(); // the carousel clicked onto a new memory
    }
    settledSnapIndex.current = index;
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onMomentumEnd: (event) => {
      runOnJS(onMomentumSettled)(event.contentOffset.y);
    },
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
    // Row spacing is PADDING (not margin) so each wrapper's onLayout height
    // is the row's full extent — the snap-offset walk depends on it.
    labelWrap: { paddingBottom: 10 },
    planWrap: { paddingBottom: 12 },
    todayWrap: { paddingTop: 12, paddingBottom: 22 },
    monthWrap: { paddingTop: 6, paddingBottom: 12 },
    entryWrap: { paddingBottom: t.density.gap },
    footer: { paddingVertical: 20, alignItems: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Scroll/Map chips — right-aligned strip just below the header (the
    // header's top row already carries + Log / Edit / gear).
    toggleBar: {
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      alignItems: 'flex-end',
    },
    viewFill: { flex: 1 },
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
      mapBackfillPages.current = 0; // fresh history — the map may backfill again
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

  // MAP BACKFILL — the one-page map is only meaningful complete. While the
  // map is open and history remains behind the cursor, keep paging: each
  // completed page changes `nextCursor`/`loadingMore`, re-running this
  // effect for the next one. Failures retry on the next run; the page
  // counter hard-caps total attempts.
  useEffect(() => {
    if (viewMode !== 'map' || !nextCursor || loadingMore) return;
    if (mapBackfillPages.current >= MAP_BACKFILL_MAX_PAGES) return;
    mapBackfillPages.current += 1;
    void loadMore();
  }, [viewMode, nextCursor, loadingMore, loadMore]);

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

  // "#1 OF N" rank chip (A19). The timeline payload carries no rank, so we
  // only claim #1 when it's provably true: the ENTIRE history is loaded
  // (no cursor left) and exactly one entry holds the top score. Otherwise
  // the chip is omitted — never faked.
  const topRank = useMemo<{ logId: string; total: number } | null>(() => {
    if (nextCursor !== null) return null; // history incomplete — can't know #1
    const entries = months.flatMap((m) => m.entries);
    let top: TimelineEntry | null = null;
    let bestScore = -Infinity;
    let tied = false;
    for (const entry of entries) {
      if (typeof entry.score !== 'number') continue;
      if (entry.score > bestScore) {
        bestScore = entry.score;
        top = entry;
        tied = false;
      } else if (entry.score === bestScore) {
        tied = true;
      }
    }
    if (!top || tied) return null;
    return { logId: top.logId, total: stats?.shows ?? entries.length };
  }, [months, nextCursor, stats]);

  // WRAPPED entry gate — cheap check on already-loaded timeline data: the
  // "'26 Wrapped" chip only appears once the current year holds ≥3 shows.
  const currentYear = new Date().getFullYear();
  const currentYearShows = useMemo(() => {
    const prefix = `${currentYear}-`;
    return months.reduce(
      (n, month) => (month.key.startsWith(prefix) ? n + month.entries.length : n),
      0,
    );
  }, [months, currentYear]);

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

  // Center-snap offsets — one per MEMORY card (see "Carousel snap
  // mechanics" above). Ascending by construction; clamped to the
  // scrollable range so no offset asks for an unreachable position.
  const snapOffsets = useMemo<number[]>(() => {
    void layoutVersion; // measured row heights changed → recompute
    const gap = tokens.density.gap;
    const memoryCardH = (windowWidth - tokens.density.pad * 2) * MEMORY_ASPECT;
    // Estimates for not-yet-measured rows (paddings included, matching the
    // wrapper styles). Real onLayout heights replace these as rows mount.
    const estimateHeight = (row: Row): number => {
      switch (row.kind) {
        case 'label':
          return 23;
        case 'plan':
          return 90;
        case 'today':
          return 47;
        case 'month':
          return 32;
        case 'emptyPast':
          return 168;
        case 'entry':
          return isMemoryEntry(row.entry) ? memoryCardH + gap : 66 + gap;
      }
    };
    // Distance from the list's top edge down to the window's vertical
    // center — the settle point FloatCard measures against.
    const centerFromTop = listWindow ? windowHeight / 2 - listWindow.pageY : windowHeight / 2;
    const maxOffset =
      listWindow && contentHeight > 0
        ? Math.max(0, contentHeight - listWindow.height)
        : Number.POSITIVE_INFINITY;

    const offsets: number[] = [];
    let y = CONTENT_TOP_PAD;
    for (const row of rows) {
      const h = rowHeights.current.get(row.key) ?? estimateHeight(row);
      if (row.kind === 'entry' && isMemoryEntry(row.entry)) {
        // The card fills the row above its bottom spacing padding.
        const cardCenter = y + (h - gap) / 2;
        const target = Math.min(Math.max(Math.round(cardCenter - centerFromTop), 0), maxOffset);
        // Keep strictly ascending (top-clamping can collide early offsets).
        if (offsets.length === 0 || target > offsets[offsets.length - 1]!) {
          offsets.push(target);
        }
      }
      y += h;
    }
    return offsets;
  }, [rows, layoutVersion, listWindow, contentHeight, windowWidth, windowHeight, tokens]);

  // The momentum-settle handler reads offsets through a ref so it never
  // needs re-binding into the animated scroll handler.
  snapOffsetsRef.current = snapOffsets;

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
  const openBackfill = useCallback(() => router.push('/(onboarding)/backfill'), [router]);
  const openSettings = useCallback(() => router.push('/settings'), [router]);
  const openEditProfile = useCallback(() => router.push('/edit-profile'), [router]);

  // ── Map ⇄ Scroll fly-to ───────────────────────────────────────

  // Map markers carry the scroll view's row keys — a tap stashes the target
  // and flips the mode; the effect below lands the jump once the list is up.
  const flyToRow = useCallback((rowKey: string) => {
    pendingScrollKey.current = rowKey;
    setViewMode('scroll');
  }, []);

  useEffect(() => {
    if (viewMode !== 'scroll') return;
    const key = pendingScrollKey.current;
    if (!key) return;
    pendingScrollKey.current = null;
    const index = rows.findIndex((row) => row.key === key);
    if (index < 0) return;
    // Give the remounted list a beat (the fade-through) before animating.
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    }, durations.fadeThrough);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on mode flips only
  }, [viewMode]);

  // Deep rows aren't measured yet — jump near by estimate, then re-aim.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: true,
      });
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.2 });
      }, 400);
    },
    [],
  );

  // ── Rows ──────────────────────────────────────────────────────

  const renderRow = useCallback(
    ({ item, index }: ListRenderItemInfo<Row>) => {
      const entering = FadeInDown.duration(300).delay(
        index < STAGGER_CUTOFF ? index * durations.stagger : 0,
      );
      // Every wrapper feeds the snap-offset height registry.
      const reportLayout = (e: { nativeEvent: { layout: { height: number } } }) =>
        onRowLayout(item.key, e.nativeEvent.layout.height);

      switch (item.kind) {
        case 'label':
          return (
            <Animated.View entering={entering} style={styles.labelWrap} onLayout={reportLayout}>
              <Text style={styles.sectionLabel}>{item.text}</Text>
            </Animated.View>
          );
        case 'plan':
          return (
            <Animated.View entering={entering} style={styles.planWrap} onLayout={reportLayout}>
              <FloatCard scrollY={scrollY}>
                <PlanCard item={item.item} onPress={() => openEvent(item.item.event.id)} />
              </FloatCard>
            </Animated.View>
          );
        case 'today':
          return (
            <Animated.View entering={entering} style={styles.todayWrap} onLayout={reportLayout}>
              <TodayDivider />
            </Animated.View>
          );
        case 'month':
          return (
            <Animated.View entering={entering} style={styles.monthWrap} onLayout={reportLayout}>
              <MonthMarker label={item.label} />
            </Animated.View>
          );
        case 'entry': {
          const isMemory = isMemoryEntry(item.entry);
          return (
            <Animated.View entering={entering} style={styles.entryWrap} onLayout={reportLayout}>
              {/* Memories are the carousel — strong curve; compact rows travel
                  between snaps on the gentle one. */}
              <FloatCard scrollY={scrollY} curve={isMemory ? 'memory' : 'ambient'}>
                {isMemory ? (
                  <MemoryCard
                    entry={item.entry}
                    onPress={() => openLog(item.entry.logId)}
                    rankLabel={
                      topRank && topRank.logId === item.entry.logId
                        ? `#1 OF ${topRank.total}`
                        : null
                    }
                  />
                ) : (
                  <CompactLogRow entry={item.entry} onPress={() => openLog(item.entry.logId)} />
                )}
              </FloatCard>
            </Animated.View>
          );
        }
        case 'emptyPast':
          return (
            <Animated.View entering={entering} onLayout={reportLayout}>
              <EmptyPastBlock onLog={openLogFlow} onBackfill={openBackfill} />
            </Animated.View>
          );
      }
    },
    [styles, scrollY, openEvent, openLog, openLogFlow, openBackfill, topRank, onRowLayout],
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
      onLog={() => router.push('/log/search')}
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
          <EmptyTimeline onLog={openLogFlow} onBackfill={openBackfill} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Backfill still running (or pending) — the map shows an inline spinner.
  const mapLoadingAll =
    loadingMore || (nextCursor !== null && mapBackfillPages.current < MAP_BACKFILL_MAX_PAGES);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      {/* A6/A10 — pinned agenda card (TONIGHT beats LAST NIGHT), above the timeline. */}
      <AgendaPin />
      {/* Wrapped entry — slim pill, only once this year has ≥3 shows. */}
      {currentYearShows >= 3 ? (
        <WrappedChip year={currentYear} onPress={() => router.push('/wrapped')} />
      ) : null}
      <View style={styles.toggleBar}>
        <TimelineViewToggle mode={viewMode} onChange={setViewMode} />
      </View>
      {viewMode === 'map' ? (
        // Quick fade-through into the zoomed-out map (motion contract §2).
        <Animated.View key="map" entering={FadeIn.duration(durations.fadeThrough)} style={styles.viewFill}>
          <TimelineMapView
            upcoming={upcoming}
            months={months}
            loadingAll={mapLoadingAll}
            onPressMarker={flyToRow}
          />
        </Animated.View>
      ) : (
        <Animated.View key="scroll" entering={FadeIn.duration(durations.fadeThrough)} style={styles.viewFill}>
          {/* Plain View: measureInWindow anchor for the snap-center math. */}
          <View ref={listWrapRef} onLayout={onListWrapLayout} style={styles.viewFill}>
            <Animated.FlatList
              ref={listRef}
              data={rows}
              renderItem={renderRow}
              keyExtractor={(row: Row) => row.key}
              onScroll={onScroll}
              scrollEventThrottle={16}
              refreshControl={refreshControl}
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={0.4}
              onScrollToIndexFailed={onScrollToIndexFailed}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              initialNumToRender={10}
              maxToRenderPerBatch={4}
              windowSize={7}
              // THE CAROUSEL: momentum settles each memory card onto the
              // window center. Ends stay free (snapToStart/End false) so the
              // plans strip and the footer remain restable; everything else
              // between snaps is travel.
              snapToOffsets={snapOffsets.length > 0 ? snapOffsets : undefined}
              snapToStart={false}
              snapToEnd={false}
              decelerationRate="fast"
              directionalLockEnabled
              onContentSizeChange={(_w: number, h: number) => setContentHeight(h)}
              contentContainerStyle={{
                paddingHorizontal: tokens.density.pad,
                paddingTop: CONTENT_TOP_PAD,
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
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
