import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../../components/ui/Screen';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SectionHead } from '../../../components/ui/SectionHead';
import { colors, spacing } from '../../../lib/theme';
import { useFeed } from '../../../hooks/useFeed';
import { usePublicFeed } from '../../../hooks/usePublicFeed';
import { useFeedActions } from '../../../hooks/useFeedActions';
import { useSession } from '../../../hooks/useSession';
import { FeedCard } from '../../../components/feed/FeedCard';
import { EmptyFeed } from '../../../components/feed/EmptyFeed';
import { FeedSkeleton } from '../../../components/feed/FeedSkeleton';
import { NotificationBellButton } from '../../../components/notifications/NotificationBellButton';
import { FeedTabBar } from '../../../components/feed/FeedTabBar';
import type { FeedItem } from '../../../types/feed';

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState<'friends' | 'public'>('friends');

  const friendsFeed = useFeed();
  const publicFeed = usePublicFeed();

  // Refresh feed when screen comes into focus (e.g., after signing in)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure token is stored after sign-in
      const timer = setTimeout(() => {
        if (activeTab === 'friends') {
          void friendsFeed.refresh();
        } else {
          void publicFeed.refresh();
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [activeTab, friendsFeed, publicFeed])
  );

  const activeFeed = activeTab === 'friends' ? friendsFeed : publicFeed;
  const { items, loading, refreshing, loadingMore, hasMore, hasNoFriends, error, requiresAuth, refresh, loadMore, updateItem, addCommentToItem } = activeFeed;
  const { toggleWasThere, submitComment } = useFeedActions();

  const handleWasThere = useCallback(
    async (logId: string, current: boolean) => {
      const success = await toggleWasThere(logId, current);
      if (success) {
        const currentItem = items.find((i) => i.log.id === logId);
        const prevCount = currentItem?.wasThereCount ?? 0;
        updateItem(logId, {
          userWasThere: !current,
          wasThereCount: Math.max(0, prevCount + (current ? -1 : 1)),
        } as any);
      }
      return success;
    },
    [items, toggleWasThere, updateItem]
  );

  const handleComment = useCallback(
    async (logId: string, text: string) => {
      return await submitComment(logId, text);
    },
    [submitComment]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <View style={styles.cardWrapper}>
        <FeedCard item={item} onWasThere={handleWasThere} onComment={handleComment} onCommentAdded={addCommentToItem} />
      </View>
    ),
    [addCommentToItem, handleComment, handleWasThere]
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

  const listHeader = useMemo(
    () => (
      <View style={styles.sectionHeadWrapper}>
        <SectionHead eyebrow="LATEST LOGS" title="Tonight's dispatches" />
      </View>
    ),
    []
  );

  const emptyMessage = useMemo(() => {
    if (activeTab !== 'friends') return null;

    // If there's an error, always show it
    if (error) {
      return error;
    }

    // Only show "Sign in" if requiresAuth is true AND there's no user
    // If user exists, we should never show "Sign in" - show error instead
    if (requiresAuth && !user) {
      return 'Sign in to view your friends feed.';
    }

    // If user exists but requiresAuth is true (shouldn't happen, but safety check)
    if (user && requiresAuth) {
      return 'Unable to load feed. Please try again.';
    }

    return null;
  }, [activeTab, error, requiresAuth, user]);

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

      {/* Tabs */}
      <View style={styles.tabBarContainer}>
        <FeedTabBar
          activeTab={activeTab === 'friends' ? 'friends' : 'discover'}
          onTabChange={(t) => setActiveTab(t === 'friends' ? 'friends' : 'public')}
        />
      </View>

      {loading && items.length === 0 ? (
        <FeedSkeleton />
      ) : emptyMessage ? (
        <View style={styles.center}>
          <Ionicons name={user ? "refresh-outline" : "lock-closed-outline"} size={48} color={colors.textLo} />
          <Text style={styles.errorText}>{emptyMessage}</Text>
          {user ? (
            // User is signed in but feed failed - check if they need to sign in online
            error?.includes('online account') || error?.includes('session expired') ? (
              // User needs to sign in with email/password to get API token
              <>
                <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={[styles.retryButton, styles.primaryButton]} accessibilityRole="button">
                  <Text style={[styles.retryText, styles.primaryButtonText]}>Sign In Online</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/(tabs)/discover')} style={styles.retryButton} accessibilityRole="button">
                  <Text style={styles.retryText}>Go to Discover</Text>
                </Pressable>
              </>
            ) : (
              // Other error - show retry
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
            // No user - show sign in option
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
        activeTab === 'friends' ? (
          <EmptyFeed hasNoFriends={Boolean(hasNoFriends)} />
        ) : (
          <EmptyState
            icon="globe-outline"
            title="Nothing in Discover yet"
            description="Public activity will show up here."
            actionLabel="Explore"
            onAction={() => router.replace('/(tabs)/discover')}
          />
        )
      ) : (
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandCyan} colors={[colors.brandCyan]} />}
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHi,
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionHeadWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  cardWrapper: {
    paddingHorizontal: 0,
    paddingBottom: 14,
  },
  listContent: {
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
