// app/(tabs)/timeline.tsx — THE TIMELINE, in its own tab (was inside You).
// Without the profile header the wheel gets the full stage: bigger,
// portrait memory cards. Header row = "Timeline" + the + Log pill; the
// deck (MemoryDeck) owns the wheel mechanics; Scroll ⇄ Map rides the
// deck's readout row. AgendaPin (tonight/resume) and the Wrapped chip
// stay with the timeline — they're timeline moments.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getUserTimeline, type TimelineMonth, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { onSnapToToday } from '../../lib/navigation/timelineBus';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';

import { AgendaPin } from '../../components/agenda/AgendaPin';
import { MemoryDeck, type DeckItem, type MemoryDeckHandle } from '../../components/timeline/MemoryDeck';
import { buildDeckItems, mergeMonths, useDeckFaces } from '../../components/timeline/deckFaces';
import { TimelineMapView } from '../../components/timeline/TimelineMapView';
import { TimelineViewToggle, type TimelineViewMode } from '../../components/timeline/TimelineViewToggle';
import { monthLabel } from '../../components/timeline/format';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

const PAGE_SIZE = 30;
const MAP_BACKFILL_MAX_PAGES = 10;

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

  // Deep-linkable view state (sticket://timeline?view=map&mode=map) — used
  // by share links and the screenshot pipeline.
  const params = useLocalSearchParams<{ view?: string; mode?: string }>();
  const [viewMode, setViewMode] = useState<TimelineViewMode>(
    params.view === 'map' ? 'map' : 'scroll',
  );
  const [deckIndex, setDeckIndex] = useState(0);
  const deckRef = useRef<MemoryDeckHandle>(null);
  const pendingScrollKey = useRef<string | null>(null);
  const mapBackfillPages = useRef(0);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    // ONE compressed header row — the MONTH is the hero: big enough to feel
    // the passage of time as the wheel ticks it over.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: t.density.pad,
      paddingTop: 6,
      paddingBottom: 4,
    },
    monthBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: t.colors.fg },
    counter: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    headerControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    toggleBar: {
      paddingHorizontal: t.density.pad,
      paddingTop: 8,
      alignItems: 'flex-end',
    },
    viewFill: { flex: 1 },
    refreshHint: { position: 'absolute', top: 2, alignSelf: 'center', zIndex: 200 },
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

  const deckItems = useMemo<DeckItem[]>(() => buildDeckItems(upcoming, months), [upcoming, months]);

  const initialDeckIndex = useMemo(() => {
    const firstEntry = deckItems.findIndex((d) => d.kind === 'entry');
    return firstEntry >= 0 ? firstEntry : Math.max(deckItems.length - 1, 0);
  }, [deckItems]);

  // The wheel's faces — shared with the profile timeline (deckFaces.tsx).
  const { renderCard, renderLabel, readoutFor } = useDeckFaces();

  const openLogFlow = useCallback(() => router.push('/log/search'), [router]);

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

  // The center ticket's tap: spin the wheel home to today (the newest
  // past entry — the boundary where plans meet history).
  useEffect(() => {
    return onSnapToToday(() => {
      if (viewMode !== 'scroll') setViewMode('scroll');
      deckRef.current?.snapTo(initialDeckIndex, true);
    });
  }, [initialDeckIndex, viewMode]);

  // EVERY arrival on this tab wheels home to today — switching tabs,
  // returning from a pushed screen, or tapping the ticket while away.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        deckRef.current?.snapTo(initialDeckIndex, true);
      }, 120);
      return () => clearTimeout(timer);
    }, [initialDeckIndex]),
  );

  // Keep the deck index in range as pages merge/refresh.
  useEffect(() => {
    setDeckIndex((i) => Math.max(0, Math.min(Math.max(deckItems.length - 1, 0), i)));
  }, [deckItems.length]);
  useEffect(() => {
    setDeckIndex(initialDeckIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first ready
  }, [status === 'ready']);

  const currentItem = deckItems[deckIndex];
  const headline =
    viewMode === 'map' || !currentItem ? 'Timeline' : monthLabel(currentItem.monthKey);

  const header = (
    <View style={styles.header}>
      {/* The month IS the Wrapped door — tap it to open your year. */}
      <SpringPressable
        haptic="light"
        onPress={() => router.push('/wrapped')}
        accessibilityRole="button"
        accessibilityLabel={`${headline}. Open Wrapped.`}
        style={styles.monthBlock}
      >
        <Animated.View key={headline} entering={FadeIn.duration(140)}>
          <Text style={styles.title} numberOfLines={1}>
            {headline}
          </Text>
        </Animated.View>
        {viewMode === 'scroll' && deckItems.length > 0 ? (
          <Text style={styles.counter}>{`${deckIndex + 1}/${deckItems.length}`}</Text>
        ) : null}
      </SpringPressable>
      <View style={styles.headerControls}>
        <TimelineViewToggle mode={viewMode} onChange={setViewMode} />
      </View>
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
      {viewMode === 'map' ? (
        <Animated.View key="map" entering={FadeIn.duration(durations.fadeThrough)} style={styles.viewFill}>
          <TimelineMapView
            upcoming={upcoming}
            months={months}
            loadingAll={mapLoadingAll}
            onPressMarker={flyToRow}
            initialMode={params.mode === 'map' ? 'map' : undefined}
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
            showReadout={false}
            onIndexChange={setDeckIndex}
            onNearEnd={() => void loadMore()}
            onOverscrollRefresh={() => void onRefresh()}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
