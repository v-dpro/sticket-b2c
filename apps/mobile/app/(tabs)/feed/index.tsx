import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '../../../components/ui/Screen';
import { colors, fontFamilies } from '../../../lib/theme';
import { useFeed } from '../../../hooks/useFeed';
import { useFeedActions } from '../../../hooks/useFeedActions';
import { useSession } from '../../../hooks/useSession';
import { FeedCard, invalidateFeedLikeCache } from '../../../components/feed/FeedCard';
import { invalidateWhoWasHereCache } from '../../../components/feed/WhoWasHere';
import { EmptyFeed } from '../../../components/feed/EmptyFeed';
import { FeedSkeleton } from '../../../components/feed/FeedSkeleton';
import { FeedRefreshWordmark } from '../../../components/feed/FeedRefreshWordmark';
import { NotificationBellButton } from '../../../components/notifications/NotificationBellButton';
import type { FeedItem } from '../../../types/feed';

// Spec (SCREENS.md §1): single friends feed, no Friends/Public tab bar.

export default function FeedScreen() {
  const router = useRouter();
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

  // Refresh feed when screen comes into focus (e.g., after signing in).
  // Held in a ref so the focus effect doesn't re-fire on every render.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure token is stored after sign-in
      const timer = setTimeout(() => {
        void refreshRef.current();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  // Pull distance drives the rotating-wordmark refresh indicator.
  const pullY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      pullY.value = e.contentOffset.y;
    },
  });

  const handleComment = useCallback(
    async (logId: string, text: string) => {
      return await submitComment(logId, text);
    },
    [submitComment]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <View style={styles.cardWrapper}>
        <FeedCard
          item={item}
          currentUserId={user?.id}
          viewerAvatarUrl={profile?.avatarUrl}
          viewerName={profile?.displayName || profile?.username}
          onComment={handleComment}
          onCommentAdded={addCommentToItem}
        />
      </View>
    ),
    [addCommentToItem, handleComment, profile?.avatarUrl, profile?.displayName, profile?.username, user?.id]
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.brandCyan} />
      </View>
    );
  };

  const emptyMessage = (() => {
    // A transient refresh failure shouldn't blank an already-loaded feed.
    if (items.length > 0) return null;
    if (error) return error;
    if (requiresAuth && !user) return 'Sign in to view your friends feed.';
    if (user && requiresAuth) return 'Unable to load feed. Please try again.';
    return null;
  })();

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — 64px, sticky */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>sticket</Text>
        <View style={styles.headerActions}>
          <NotificationBellButton />
        </View>
      </View>

      {loading && items.length === 0 ? (
        <FeedSkeleton />
      ) : emptyMessage ? (
        <View style={styles.center}>
          <Ionicons name={user ? 'refresh-outline' : 'lock-closed-outline'} size={48} color={colors.textLo} />
          <Text style={styles.errorText}>{emptyMessage}</Text>
          {user ? (
            error?.includes('online account') || error?.includes('session expired') ? (
              <>
                <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={[styles.retryButton, styles.primaryButton]} accessibilityRole="button">
                  <Text style={[styles.retryText, styles.primaryButtonText]}>Sign In Online</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/(tabs)/discover')} style={styles.retryButton} accessibilityRole="button">
                  <Text style={styles.retryText}>Go to Discover</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={refresh} style={[styles.retryButton, styles.primaryButton]} accessibilityRole="button">
                  <Text style={[styles.retryText, styles.primaryButtonText]}>Try Again</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/(tabs)/discover')} style={styles.retryButton} accessibilityRole="button">
                  <Text style={styles.retryText}>Go to Discover</Text>
                </Pressable>
              </>
            )
          ) : (
            <>
              <Pressable onPress={() => router.replace('/(auth)/welcome')} style={[styles.retryButton, styles.primaryButton]} accessibilityRole="button">
                <Text style={[styles.retryText, styles.primaryButtonText]}>Sign In</Text>
              </Pressable>
              <Pressable onPress={() => router.replace('/(tabs)/discover')} style={styles.retryButton} accessibilityRole="button">
                <Text style={styles.retryText}>Go to Discover</Text>
              </Pressable>
              <Pressable onPress={refresh} style={styles.retryButton} accessibilityRole="button">
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <EmptyFeed hasNoFriends={Boolean(hasNoFriends)} />
      ) : (
        <View style={styles.listHost}>
          <Animated.FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  // Explicit pull — also refetch per-card social data.
                  invalidateFeedLikeCache();
                  invalidateWhoWasHereCache();
                  void refresh();
                }}
                // iOS: hide the system spinner — the rotating wordmark
                // overlay is the indicator. Android has no over-scroll
                // offset, so keep a themed system spinner there.
                tintColor={Platform.OS === 'ios' ? 'transparent' : undefined}
                colors={[colors.brandCyan]}
                progressBackgroundColor={colors.elevated}
              />
            }
            onEndReached={() => {
              if (hasMore) loadMore();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          {Platform.OS === 'ios' ? <FeedRefreshWordmark pullY={pullY} refreshing={refreshing} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.ink,
  },
  wordmark: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHi,
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHost: {
    flex: 1,
  },
  cardWrapper: {
    paddingBottom: 12,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 110,
  },
  footer: {
    paddingVertical: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    color: colors.textMid,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  retryText: {
    color: colors.textHi,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: colors.brandPurple,
    borderColor: 'transparent',
  },
  primaryButtonText: {
    color: colors.textHi,
  },
});
