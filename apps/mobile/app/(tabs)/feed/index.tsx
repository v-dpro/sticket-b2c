import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../../components/ui/Screen';
import { EmptyState } from '../../../components/ui/EmptyState';
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
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
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
        <ActivityIndicator size="small" color={colors.brandPurple} />
      </View>
    );
  };

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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
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
          <Ionicons name={user ? "refresh-outline" : "lock-closed-outline"} size={48} color={colors.textSecondary} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPurple} colors={[colors.brandPurple]} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
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
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: colors.brandPurple,
    borderColor: 'transparent',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});




