// app/(tabs)/timeline.tsx — THE TIMELINE, in its own tab (was inside You).
// Without the profile header the wheel gets the full stage: bigger,
// portrait memory cards. Header row = "Timeline" + the + Log pill; the
// deck (MemoryDeck) owns the wheel mechanics; Scroll ⇄ Map rides the
// deck's readout row. AgendaPin (tonight/resume) and the Wrapped chip
// stay with the timeline — they're timeline moments.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getUserTimeline, type TimelineEntry, type TimelineMonth, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';

import { AgendaPin } from '../../components/agenda/AgendaPin';
import { CompactLogRow } from '../../components/timeline/CompactLogRow';
import { MemoryCard } from '../../components/timeline/MemoryCard';
import { MemoryDeck, type DeckItem, type MemoryDeckHandle } from '../../components/timeline/MemoryDeck';
import { PlanCard } from '../../components/timeline/PlanCard';
import { TimelineMapView } from '../../components/timeline/TimelineMapView';
import { TimelineViewToggle, type TimelineViewMode } from '../../components/timeline/TimelineViewToggle';
import { countdownLabel, formatShortDate, monthLabel } from '../../components/timeline/format';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { WrappedChip } from '../../components/wrapped/WrappedChip';

const PAGE_SIZE = 30;
const MAP_BACKFILL_MAX_PAGES = 10;

/** Shared + photographed ⇒ full memory card; otherwise the quiet row. */
function isMemoryEntry(entry: TimelineEntry): boolean {
  return entry.sharedAt !== null && entry.photos.length > 0;
}

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

export default function TimelineScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [upcoming, setUpcoming] = useState<TimelineUpcomingItem[]>([]);
  const [months, setMonths] = useState<TimelineMonth[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const [viewMode, setViewMode] = useState<TimelineViewMode>('scroll');
  const deckRef = useRef<MemoryDeckHandle>(null);
  const pendingScrollKey = useRef<string | null>(null);
  const mapBackfillPages = useRef(0);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      paddingBottom: 6,
    },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    toggleBar: {
      paddingHorizontal: t.density.pad,
      paddingTop: 8,
      alignItems: 'flex-end',
    },
    viewFill: { flex: 1 },
    refreshHint: { position: 'absolute', top: 2, alignSelf: 'center', zIndex: 200 },
    deckLabel: { alignItems: 'center', gap: 5, paddingHorizontal: 24 },
    deckLabelName: { fontSize: 17, fontWeight: '700', color: t.colors.fg, textAlign: 'center' },
    deckLabelMeta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      textAlign: 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: t.density.gap,
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    emptySub: { fontSize: 14, color: t.colors.mute, textAlign: 'center' },
  }));

  // ── Data ──────────────────────────────────────────────────────

  const load = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      const timeline = await getUserTimeline(userId, { limit: PAGE_SIZE });
      setUpcoming(timeline.upcoming ?? []);
      setMonths(timeline.months ?? []);
      setNextCursor(timeline.nextCursor ?? null);
      mapBackfillPages.current = 0;
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
      // next near-end retries
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userId, nextCursor]);

  useEffect(() => {
    if (viewMode !== 'map' || !nextCursor || loadingMore) return;
    if (mapBackfillPages.current >= MAP_BACKFILL_MAX_PAGES) return;
    mapBackfillPages.current += 1;
    void loadMore();
  }, [viewMode, nextCursor, loadingMore, loadMore]);

  // ── The deck ──────────────────────────────────────────────────

  const deckItems = useMemo<DeckItem[]>(() => {
    const out: DeckItem[] = [];
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

  const initialDeckIndex = useMemo(() => {
    const firstEntry = deckItems.findIndex((d) => d.kind === 'entry');
    return firstEntry >= 0 ? firstEntry : Math.max(deckItems.length - 1, 0);
  }, [deckItems]);

  const readoutFor = useCallback((item: DeckItem) => {
    const label = monthLabel(item.monthKey);
    return item.kind === 'plan' ? `UPCOMING · ${label}` : label;
  }, []);

  const openLog = useCallback(
    (logId: string) => router.push({ pathname: '/log/[id]', params: { id: logId } }),
    [router],
  );
  const openEvent = useCallback(
    (eventId: string) => router.push({ pathname: '/event/[eventId]', params: { eventId } }),
    [router],
  );
  const openLogFlow = useCallback(() => router.push('/log/search'), [router]);

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
            // Full-tab stage: the photo goes properly portrait.
            photoAspect={0.82}
          />
        );
      }
      return <CompactLogRow entry={item.entry} onPress={() => openLog(item.entry.logId)} />;
    },
    [openEvent, openLog],
  );

  const renderLabel = useCallback(
    (item: DeckItem) => {
      if (item.kind === 'plan') {
        const ev = item.item.event;
        return (
          <View style={styles.deckLabel}>
            <Text style={styles.deckLabelName} numberOfLines={1}>
              {ev.name}
            </Text>
            <Text style={styles.deckLabelMeta} numberOfLines={1}>
              {[ev.venue?.name, countdownLabel(ev.date)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        );
      }
      const entry = item.entry;
      return (
        <View style={styles.deckLabel}>
          <Text style={styles.deckLabelName} numberOfLines={1}>
            {entry.artist.name}
          </Text>
          <Text style={styles.deckLabelMeta} numberOfLines={1}>
            {[entry.venue.name, formatShortDate(entry.event.date)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      );
    },
    [styles],
  );

  // ── Map ⇄ Deck fly-to ─────────────────────────────────────────

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
    const timer = setTimeout(() => {
      deckRef.current?.snapTo(index, true);
    }, durations.fadeThrough);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on mode flips only
  }, [viewMode]);

  // ── Render ────────────────────────────────────────────────────

  const currentYear = new Date().getFullYear();
  const currentYearShows = useMemo(() => {
    const prefix = `${currentYear}-`;
    return months.reduce(
      (n, month) => (month.key.startsWith(prefix) ? n + month.entries.length : n),
      0,
    );
  }, [months, currentYear]);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Timeline</Text>
      <PillButton title="+ Log" variant="primary" onPress={openLogFlow} springFeedback haptic="light" />
    </View>
  );

  if (!userId || status === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        <View style={styles.center}>
          <ErrorState title="Couldn't load your timeline" message={errorMsg ?? undefined} onRetry={retry} />
        </View>
      </SafeAreaView>
    );
  }

  if (deckItems.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your live-events life starts here</Text>
          <Text style={styles.emptySub}>Log your first show — past shows count.</Text>
          <PillButton title="Log a show" variant="primary" size="lg" onPress={openLogFlow} springFeedback haptic="light" />
        </View>
      </SafeAreaView>
    );
  }

  const mapLoadingAll =
    loadingMore || (nextCursor !== null && mapBackfillPages.current < MAP_BACKFILL_MAX_PAGES);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      <AgendaPin />
      {currentYearShows >= 3 ? (
        <WrappedChip year={currentYear} onPress={() => router.push('/wrapped')} />
      ) : null}
      {viewMode === 'map' ? (
        <Animated.View key="map" entering={FadeIn.duration(durations.fadeThrough)} style={styles.viewFill}>
          <View style={styles.toggleBar}>
            <TimelineViewToggle mode={viewMode} onChange={setViewMode} />
          </View>
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
            renderLabel={renderLabel}
            readoutFor={readoutFor}
            accessory={<TimelineViewToggle mode={viewMode} onChange={setViewMode} />}
            onNearEnd={() => void loadMore()}
            onOverscrollRefresh={() => void onRefresh()}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
