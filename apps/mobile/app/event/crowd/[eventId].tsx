// Crowd feed — the full "from the crowd" feed for one event: every public
// memory post, rendered with the same FeedCard as the home feed. Pushed
// from the event page's "See all N →" pill.
//
// API: GET /events/:id/feed?cursor&limit (same item shape as GET /feed).

import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { EntityNav } from '../../../components/entity/EntityChrome';
import { EntityError } from '../../../components/entity/EntityStates';
import { FeedCard, invalidateFeedLikeCache } from '../../../components/feed/FeedCard';
import { FeedSkeleton } from '../../../components/feed/FeedSkeleton';
import { useSession } from '../../../hooks/useSession';
import { getEventFeed } from '../../../lib/api/events';
import { durations } from '../../../lib/motion';
import { useSafeBack } from '../../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../../lib/theme-context';
import type { FeedItem } from '../../../types/feed';

const PAGE = 10;

// Entrance stagger only for the first screenful of cards — rows mounted
// later (scroll-in) appear without delay (same pattern as the timeline).
const STAGGER_CUTOFF = 4;

export default function EventCrowdFeedScreen() {
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { user } = useSession();
  const params = useLocalSearchParams<{ eventId: string; eventName?: string }>();
  const id = params.eventId ? String(params.eventId) : '';
  const eventName = params.eventName ? String(params.eventName) : '';

  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const loadFirstPage = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getEventFeed(id, { limit: PAGE });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setCursor(res?.nextCursor ?? null);
      setError(null);
    } catch {
      setError("Couldn't load the crowd feed.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadFirstPage();
  }, [loadFirstPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    invalidateFeedLikeCache();
    try {
      await loadFirstPage();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!cursor || busyRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const res = await getEventFeed(id, { cursor, limit: PAGE });
      const next = Array.isArray(res?.items) ? res.items : [];
      setItems((prev) => {
        const seen = new Set(prev.map((it) => it.id));
        return [...prev, ...next.filter((it) => !seen.has(it.id))];
      });
      setCursor(res?.nextCursor ?? null);
    } catch {
      // quiet — the footer spinner just disappears; scroll again to retry
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor, id]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    headerBlock: { paddingHorizontal: t.density.pad, paddingTop: 6, paddingBottom: 14 },
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
    cardWrapper: { paddingBottom: 22 },
    listContent: { paddingTop: 4 },
    footer: { paddingVertical: 20 },
    emptyWrap: { paddingHorizontal: 32, paddingTop: 60, alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: t.colors.fg, textAlign: 'center' },
    emptyBody: { fontSize: 13, color: t.colors.mute, textAlign: 'center', lineHeight: 19 },
  }));

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(index < STAGGER_CUTOFF ? index * durations.stagger : 0)
          .duration(380)
          .easing(Easing.bezier(0.2, 0.7, 0.3, 1))
          .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })}
        style={styles.cardWrapper}
      >
        <FeedCard item={item} currentUserId={user?.id} />
      </Animated.View>
    ),
    [styles.cardWrapper, user?.id],
  );

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.eyebrow}>From the crowd</Text>
      {eventName ? (
        <Text style={styles.title} numberOfLines={2}>
          {eventName}
        </Text>
      ) : null}
    </View>
  );

  let body: React.ReactNode;
  if (loading && items.length === 0) {
    body = (
      <>
        {header}
        <FeedSkeleton />
      </>
    );
  } else if (error && items.length === 0) {
    body = (
      <EntityError
        title="Couldn't load the crowd feed"
        message={error}
        onRetry={() => {
          setLoading(true);
          void loadFirstPage();
        }}
        onBack={goBack}
      />
    );
  } else {
    body = (
      <Animated.FlatList
        data={items}
        keyExtractor={(item: FeedItem) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={4}
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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No memories yet</Text>
            <Text style={styles.emptyBody}>
              Public memory posts from this show will land here.
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 60 }]}
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
