import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ProfileHeader } from '../../../components/profile/ProfileHeader';
import { ViewToggle, type ViewMode } from '../../../components/profile/ViewToggle';
import { TimelineView } from '../../../components/profile/TimelineView';
import { ProfileMapView } from '../../../components/profile/MapView';
import { BadgeGrid } from '../../../components/profile/BadgeGrid';
import { StatsRow } from '../../../components/profile/StatsRow';
import { ProfileGridView } from '../../../components/profile/ProfileGridView';
import { ProfileStatsView } from '../../../components/profile/ProfileStatsView';
import { colors, spacing, fonts, radius } from '../../../lib/theme';
import { useProfile } from '../../../hooks/useProfile';
import { useUserLogs } from '../../../hooks/useUserLogs';
import { useSession } from '../../../hooks/useSession';
import { useTickets } from '../../../hooks/useTickets';
import type { LogEntry } from '../../../types/profile';
import type { ShareCardData } from '../../../types/share';
import { ShareButton } from '../../../components/share/ShareButton';
import { createUserLink } from '../../../lib/share/deepLinks';
import { NotificationBellButton } from '../../../components/notifications/NotificationBellButton';

function TicketPreview() {
  const router = useRouter();
  const { upcomingGroups } = useTickets();

  const upcomingCount = upcomingGroups.reduce((acc, g) => acc + g.tickets.length, 0);
  const nextTicket = upcomingGroups[0]?.tickets[0];

  return (
    <Pressable onPress={() => router.push('/wallet')} style={styles.ticketPreview} accessibilityRole="button">
      <View style={styles.ticketPreviewLeft}>
        <Ionicons name="ticket" size={20} color={colors.brandCyan} />
        <View>
          <Text style={styles.ticketPreviewTitle}>My Tickets</Text>
          {nextTicket ? (
            <Text style={styles.ticketPreviewSub} numberOfLines={1}>
              Next: {nextTicket.event?.artist?.name}
            </Text>
          ) : (
            <Text style={styles.ticketPreviewSub}>No upcoming shows</Text>
          )}
        </View>
      </View>
      <View style={styles.ticketPreviewRight}>
        {upcomingCount > 0 ? (
          <View style={styles.ticketBadge}>
            <Text style={styles.ticketBadgeText}>{upcomingCount}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile();
  const { logs, years, loading: logsLoading, hasMore, loadMore, refresh } = useUserLogs(user?.id || '', selectedYear || undefined);

  // IMPORTANT: Don't use hooks (useMemo) below early-return branches.
  // Compute share data without hooks so hook order is stable across renders.
  const statsShareData: ShareCardData = {
    type: 'stats',
    stats: {
      username: profile?.username ?? '',
      avatar: profile?.avatarUrl || undefined,
      showCount: profile?.stats?.shows ?? 0,
      artistCount: profile?.stats?.artists ?? 0,
      venueCount: profile?.stats?.venues ?? 0,
    },
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleFollowers = () => {
    router.push('/followers');
  };

  const handleFollowing = () => {
    router.push('/following');
  };

  const handleFindFriends = () => {
    router.push('/find-friends');
  };

  const handleBadges = () => {
    router.push('/badges');
  };

  const handleLogPress = (log: LogEntry) => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: log.event.id } });
  };

  const handleVenuePress = (venueId: string) => {
    router.push({ pathname: '/venue/[venueId]', params: { venueId } });
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  if (sessionLoading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brandPurple} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>Sign in to view your profile</Text>
        <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>{profileError || 'Failed to load profile'}</Text>
        <Pressable onPress={refetchProfile} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const headerBlock = (
    <View>
      {/* Profile Header */}
      <ProfileHeader profile={profile} onEditPress={handleEditProfile} onFollowersPress={handleFollowers} onFollowingPress={handleFollowing} />

      {/* Stats */}
      <StatsRow shows={profile.stats.shows} artists={profile.stats.artists} venues={profile.stats.venues} />

      <TicketPreview />

      <Pressable onPress={handleFindFriends} style={styles.findFriendsButton}>
        <Ionicons name="people-outline" size={18} color={colors.brandCyan} style={styles.leftIcon} />
        <Text style={styles.findFriendsText}>Find Friends</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      {/* Badges */}
      <BadgeGrid badges={profile.badges} />
      <Pressable onPress={handleBadges} style={styles.badgesButton}>
        <Ionicons name="ribbon-outline" size={18} color={colors.brandPurple} style={styles.leftIcon} />
        <Text style={styles.badgesText}>View all badges</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      {/* View Toggle */}
      <ViewToggle value={viewMode} onChange={setViewMode} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with settings */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerActions}>
          <ShareButton data={statsShareData} link={createUserLink(profile.username)} />
          <NotificationBellButton color={colors.textPrimary} badgeSize="medium" />
          <Pressable onPress={handleSettings} style={styles.settingsButton} accessibilityRole="button">
            <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {viewMode === 'timeline' ? (
          <TimelineView
            headerComponent={headerBlock}
            logs={logs}
            years={years}
            selectedYear={selectedYear}
            onYearSelect={setSelectedYear}
            onLogPress={handleLogPress}
            onLoadMore={loadMore}
            onRefresh={refresh}
            loading={logsLoading}
            hasMore={hasMore}
          />
        ) : viewMode === 'grid' ? (
          <ProfileGridView
            headerComponent={headerBlock}
            logs={logs}
            years={years}
            selectedYear={selectedYear}
            onYearSelect={setSelectedYear}
            onLogPress={handleLogPress}
            onLoadMore={loadMore}
            onRefresh={refresh}
            loading={logsLoading}
            hasMore={hasMore}
          />
        ) : viewMode === 'stats' ? (
          <ProfileStatsView
            headerComponent={headerBlock}
            logs={logs}
            years={years}
            selectedYear={selectedYear}
            onYearSelect={setSelectedYear}
            loading={logsLoading}
            onRefresh={refresh}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.mapScrollContent}>
            {headerBlock}

            <ProfileMapView userId={user?.id || ''} onVenuePress={handleVenuePress} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.brandPurple,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.semibold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  content: {
    flex: 1,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  findFriendsButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: radius.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.35)',
    backgroundColor: 'rgba(17, 10, 58, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  findFriendsText: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.bold,
  },
  badgesButton: {
    marginHorizontal: spacing.md,
    marginTop: 0,
    marginBottom: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: radius.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    backgroundColor: 'rgba(17, 10, 58, 0.22)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: 10,
  },
  badgesText: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.bold,
  },
  ticketPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: radius.md,
  },
  ticketPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ticketPreviewSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ticketPreviewRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketBadge: {
    backgroundColor: colors.brandPurple,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ticketBadgeText: {
    color: colors.textPrimary,
    fontSize: fonts.caption,
    fontWeight: fonts.bold,
  },
  mapScrollContent: {
    paddingBottom: spacing.xl,
  },
});



