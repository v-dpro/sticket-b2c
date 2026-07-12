// app/(tabs)/you.tsx — THE TIMELINE, as a FLOATING MEMORY DECK. The screen
// itself never scrolls: a fixed stage holds the centered card on its own
// floating surface while neighbors recede behind it, a vertical swipe moves
// the CARDS through the stage (spring settle, haptic click per card, firmer
// tick on month crossings), and the fixed readout above the stage carries
// the month as it changes — MemoryDeck owns those mechanics. Deck order is
// chronological: furthest-out plan first, then TODAY's neighbors, then past
// months newest→oldest. The 2D map view (Scroll ⇄ Map toggle) is unchanged.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
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

import { AgendaPin } from '../../components/agenda/AgendaPin';
import { CompactLogRow } from '../../components/timeline/CompactLogRow';
import { MemoryCard } from '../../components/timeline/MemoryCard';
import { MemoryDeck, type DeckItem, type MemoryDeckHandle } from '../../components/timeline/MemoryDeck';
import { PlanCard } from '../../components/timeline/PlanCard';
import { TimelineHeader } from '../../components/timeline/TimelineHeader';
import { TimelineMapView } from '../../components/timeline/TimelineMapView';
import { TimelineViewToggle, type TimelineViewMode } from '../../components/timeline/TimelineViewToggle';
import { monthLabel } from '../../components/timeline/format';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { WrappedChip } from '../../components/wrapped/WrappedChip';

const PAGE_SIZE = 30;
// Map view backfills the rest of history when opened (it's only meaningful
// complete) — hard cap on how many extra pages it may pull.
const MAP_BACKFILL_MAX_PAGES = 10;

/** Shared + photographed ⇒ full memory card; otherwise the quiet row. */
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
  const deckRef = useRef<MemoryDeckHandle>(null);
  // Deck key a map-marker tap wants the stage to land on.
  const pendingScrollKey = useRef<string | null>(null);
  // Pages pulled by the map's backfill loop (counts toward the hard cap).
  const mapBackfillPages = useRef(0);

  const styles = useThemedStyles((t) => ({
    screen: {
      flex: 1,
      backgroundColor: t.colors.bg,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Scroll/Map chips — right-aligned strip just below the header (the
    // header's top row already carries + Log / Edit / gear).
    toggleBar: {
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      alignItems: 'flex-end',
    },
    viewFill: { flex: 1 },
    refreshHint: {
      position: 'absolute',
      top: 2,
      alignSelf: 'center',
      zIndex: 200,
    },
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
      // Keep the cursor — the next near-end retries.
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

  // ── The deck ──────────────────────────────────────────────────
  // Chronological: furthest-out plan first (swipe DOWN from the opening
  // card to reach the future), then past entries newest→oldest (swipe UP
  // to go deeper into history). Keys match the map view's fly-to targets.

  const deckItems = useMemo<DeckItem[]>(() => {
    const out: DeckItem[] = [];
    // API returns ascending; reverse so the furthest-out plan is first and
    // the next show sits right before the past.
    for (let i = upcoming.length - 1; i >= 0; i--) {
      const item = upcoming[i]!;
      out.push({
        kind: 'plan',
        key: `plan-${item.type}-${item.id}`,
        item,
        monthKey: item.event.date.slice(0, 7),
      });
    }
    for (const month of months) {
      for (const entry of month.entries) {
        out.push({ kind: 'entry', key: `log-${entry.logId}`, entry, monthKey: month.key });
      }
    }
    return out;
  }, [upcoming, months]);

  // The stage opens on the newest PAST memory (index of the first entry);
  // upcoming-only decks open on the soonest plan (the last item).
  const initialDeckIndex = useMemo(() => {
    const firstEntry = deckItems.findIndex((d) => d.kind === 'entry');
    return firstEntry >= 0 ? firstEntry : Math.max(deckItems.length - 1, 0);
  }, [deckItems]);

  const readoutFor = useCallback((item: DeckItem) => {
    const label = monthLabel(item.monthKey);
    return item.kind === 'plan' ? `UPCOMING · ${label}` : label;
  }, []);

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

  const renderCard = useCallback(
    (item: DeckItem) => {
      if (item.kind === 'plan') {
        return <PlanCard item={item.item} onPress={() => openEvent(item.item.event.id)} />;
      }
      if (isMemoryEntry(item.entry)) {
        return (
          <MemoryCard
            entry={item.entry}
            onPress={() => openLog(item.entry.logId)}
            rankLabel={
              topRank && topRank.logId === item.entry.logId ? `#1 OF ${topRank.total}` : null
            }
          />
        );
      }
      return <CompactLogRow entry={item.entry} onPress={() => openLog(item.entry.logId)} />;
    },
    [openEvent, openLog, topRank],
  );

  // ── Map ⇄ Deck fly-to ─────────────────────────────────────────

  // Map markers carry the deck's item keys — a tap stashes the target and
  // flips the mode; the effect below lands the jump once the stage is up.
  const flyToRow = useCallback((rowKey: string) => {
    pendingScrollKey.current = rowKey;
    setViewMode('scroll');
  }, []);

  useEffect(() => {
    if (viewMode !== 'scroll') return;
    const key = pendingScrollKey.current;
    if (!key) return;
    pendingScrollKey.current = null;
    const index = deckItems.findIndex((item) => item.key === key);
    if (index < 0) return;
    // Give the remounted stage a beat before flying.
    const timer = setTimeout(() => {
      deckRef.current?.snapTo(index, true);
    }, durations.fadeThrough);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on mode flips only
  }, [viewMode]);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={tokens.colors.mute}
              colors={[tokens.colors.accent]}
              progressBackgroundColor={tokens.colors.card2}
            />
          }
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
        // In-place view swap — the one place a fade is still the right move.
        <Animated.View key="map" entering={FadeIn.duration(durations.fadeThrough)} style={styles.viewFill}>
          <TimelineMapView
            upcoming={upcoming}
            months={months}
            loadingAll={mapLoadingAll}
            onPressMarker={flyToRow}
          />
        </Animated.View>
      ) : (
        <Animated.View key="deck" entering={FadeIn.duration(durations.fadeThrough)} style={styles.viewFill}>
          {refreshing ? (
            <View style={styles.refreshHint} pointerEvents="none">
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : null}
          <MemoryDeck
            ref={deckRef}
            items={deckItems}
            initialIndex={initialDeckIndex}
            renderCard={renderCard}
            readoutFor={readoutFor}
            onNearEnd={() => void loadMore()}
            onOverscrollRefresh={() => void onRefresh()}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
