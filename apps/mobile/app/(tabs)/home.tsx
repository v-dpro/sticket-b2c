// Home — the friends feed.
//
// Fresh shell for the redesign: near-black stage, 800-weight wordmark,
// monochrome chrome. Data wiring reuses the existing feed hooks and the
// FeedCard family; a full FeedCard v2 lands next wave.

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EmptyFeed } from '../../components/feed/EmptyFeed';
import { FeedCard, invalidateFeedLikeCache } from '../../components/feed/FeedCard';
import { FeedSkeleton } from '../../components/feed/FeedSkeleton';
import { invalidateWhoWasHereCache } from '../../components/feed/WhoWasHere';
import { NotificationBellButton } from '../../components/notifications/NotificationBellButton';
import { PillButton } from '../../components/ui/PillButton';
import { useFeed } from '../../hooks/useFeed';
import { useFeedActions } from '../../hooks/useFeedActions';
import { useSession } from '../../hooks/useSession';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { FeedItem } from '../../types/feed';

export default function HomeScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
    },
    wordmark: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: t.colors.fg,
    },
    cardWrapper: { paddingBottom: 12 },
    listContent: { paddingTop: 4, paddingBottom: 110 },
    footer: { paddingVertical: 20 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: t.density.gap,
    },
    stateTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: t.colors.fg,
      textAlign: 'center',
    },
    stateBody: {
      fontSize: 14,
      color: t.colors.textSoft,
      textAlign: 'center',
      lineHeight: 20,
    },
    stateActions: { gap: 10, marginTop: 6, alignSelf: 'stretch' },
  }));

  const { user, profile } = useSession();
  const {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    hasNoFriends,
    error,
    requiresAuth,
    refresh,
    loadMore,
    addCommentToItem,
  } = useFeed();
  const { submitComment } = useFeedActions();

  // Refresh when the tab regains focus (e.g. right after sign-in).
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        void refreshRef.current();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const handleComment = useCallback(
    async (logId: string, text: string) => submitComment(logId, text),
    [submitComment]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index, 6) * durations.stagger).duration(240)}
        style={styles.cardWrapper}
      >
        <FeedCard
          item={item}
          currentUserId={user?.id}
          viewerAvatarUrl={profile?.avatarUrl}
          viewerName={profile?.displayName || profile?.username}
          onComment={handleComment}
          onCommentAdded={addCommentToItem}
        />
      </Animated.View>
    ),
    [addCommentToItem, handleComment, profile?.avatarUrl, profile?.displayName, profile?.username, styles.cardWrapper, user?.id]
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const needsSignIn = Boolean(
    (!user && requiresAuth) || error?.includes('online account') || error?.includes('session expired')
  );

  let body: React.ReactNode;
  if (loading && items.length === 0) {
    body = <FeedSkeleton />;
  } else if (items.length === 0 && (error || (requiresAuth && !user))) {
    body = (
      <View style={styles.center}>
        <Ionicons
          name={needsSignIn ? 'lock-closed-outline' : 'cloud-offline-outline'}
          size={40}
          color={tokens.colors.muteSoft}
        />
        <Text style={styles.stateTitle}>
          {needsSignIn ? 'Sign in to see your feed' : "Couldn't load your feed"}
        </Text>
        <Text style={styles.stateBody}>
          {needsSignIn
            ? 'Your friends’ shows live here.'
            : error ?? 'Something went wrong. Give it another shot.'}
        </Text>
        <View style={styles.stateActions}>
          {needsSignIn ? (
            <PillButton
              title="Sign in"
              size="lg"
              springFeedback
              haptic="light"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          ) : (
            <PillButton title="Try again" size="lg" springFeedback haptic="light" onPress={() => void refresh()} />
          )}
          <PillButton
            title="Explore shows"
            variant="ghost"
            size="lg"
            springFeedback
            onPress={() => router.replace('/(tabs)/explore')}
          />
        </View>
      </View>
    );
  } else if (items.length === 0) {
    body = <EmptyFeed hasNoFriends={Boolean(hasNoFriends)} />;
  } else {
    body = (
      <Animated.FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              invalidateFeedLikeCache();
              invalidateWhoWasHereCache();
              void refresh();
            }}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>sticket</Text>
        <NotificationBellButton color={tokens.colors.fg} />
      </View>
      {body}
    </SafeAreaView>
  );
}
