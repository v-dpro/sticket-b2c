// Venue shows — "All shows here": every event at one venue, filterable by
// All / Upcoming / Past segmented chips. Pushed from the venue page's
// "All shows here · N →" row. Rows share the tour-page show anatomy
// (name 700 · artist·date mono · logCount + avgScore mono chips → /event/[id]).
//
// API: GET /venues/:id/events?cursor&limit&scope=all|upcoming|past.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { Chip } from '../../../components/entity/EntityBits';
import { EntityNav } from '../../../components/entity/EntityChrome';
import { EntityError, RowSkeletons } from '../../../components/entity/EntityStates';
import { EventRow } from '../../../components/entity/EventRow';
import { monoDateYear } from '../../../components/entity/format';
import {
  getVenueEvents,
  type VenueEventItem,
  type VenueEventsScope,
} from '../../../lib/api/venues';
import { useSafeBack } from '../../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../../lib/theme-context';

const PAGE = 20;

const SCOPES: { key: VenueEventsScope; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

const EMPTY_COPY: Record<VenueEventsScope, string> = {
  all: 'No shows on the books here yet.',
  upcoming: 'No upcoming shows announced here yet.',
  past: 'No past shows logged here yet.',
};

export default function VenueShowsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{ venueId: string; venueName?: string }>();
  const id = params.venueId ? String(params.venueId) : '';
  const venueName = params.venueName ? String(params.venueName) : '';

  const [scope, setScope] = useState<VenueEventsScope>('all');
  const [items, setItems] = useState<VenueEventItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const loadFirstPage = useCallback(
    async (activeScope: VenueEventsScope) => {
      if (!id) return;
      try {
        const res = await getVenueEvents(id, { scope: activeScope, limit: PAGE });
        setItems(Array.isArray(res?.items) ? res.items : []);
        setCursor(res?.nextCursor ?? null);
        setError(null);
      } catch {
        setError("Couldn't load this venue's shows.");
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setCursor(null);
    void loadFirstPage(scope);
  }, [loadFirstPage, scope]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFirstPage(scope);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!cursor || busyRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const res = await getVenueEvents(id, { scope, cursor, limit: PAGE });
      const next = Array.isArray(res?.items) ? res.items : [];
      setItems((prev) => {
        const seen = new Set(prev.map((it) => it.id));
        return [...prev, ...next.filter((it) => !seen.has(it.id))];
      });
      setCursor(res?.nextCursor ?? null);
    } catch {
      // quiet — scrolling again retries
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor, id, scope]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    headerBlock: { paddingHorizontal: t.density.pad, paddingTop: 6 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 6,
      lineHeight: 27,
    },
    chipRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 6 },
    rowWrap: { paddingHorizontal: t.density.pad },
    footer: { paddingVertical: 20 },
    empty: {
      fontSize: 13,
      color: t.colors.mute,
      lineHeight: 19,
      paddingHorizontal: t.density.pad,
      paddingTop: 18,
    },
  }));

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.eyebrow}>All shows here</Text>
      {venueName ? (
        <Text style={styles.title} numberOfLines={2}>
          {venueName}
        </Text>
      ) : null}
      <View style={styles.chipRow}>
        {SCOPES.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            active={scope === s.key}
            onPress={() => setScope(s.key)}
          />
        ))}
      </View>
    </View>
  );

  const renderRow = ({ item, index }: { item: VenueEventItem; index: number }) => (
    <View style={styles.rowWrap}>
      <EventRow
        index={index % PAGE}
        title={item.name}
        meta={`${item.artist.name} · ${monoDateYear(item.date)}`}
        logCount={item.logCount}
        avgScore={item.avgScore}
        onPress={() =>
          router.push({ pathname: '/event/[eventId]', params: { eventId: item.id } })
        }
      />
    </View>
  );

  let body: React.ReactNode;
  if (loading && items.length === 0) {
    body = (
      <>
        {header}
        <View style={{ paddingTop: 10 }}>
          <RowSkeletons count={6} />
        </View>
      </>
    );
  } else if (error && items.length === 0) {
    body = (
      <>
        {header}
        <EntityError
          title="Couldn't load shows"
          message={error}
          onRetry={() => {
            setLoading(true);
            void loadFirstPage(scope);
          }}
          onBack={goBack}
        />
      </>
    );
  } else {
    body = (
      <Animated.FlatList
        data={items}
        keyExtractor={(item: VenueEventItem) => item.id}
        renderItem={renderRow}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={9}
        windowSize={7}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>{EMPTY_COPY[scope]}</Text>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} />
      </View>
      {body}
    </View>
  );
}
