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
import { colors } from '../../../lib/theme';
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
        <ActivityIndicator size="large" color="#8B5CF6" />
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
        <Ionicons name="people-outline" size={18} color="#00D4FF" style={styles.leftIcon} />
        <Text style={styles.findFriendsText}>Find Friends</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color="#6B6B8D" />
      </Pressable>

      {/* Badges */}
      <BadgeGrid badges={profile.badges} />
      <Pressable onPress={handleBadges} style={styles.badgesButton}>
        <Ionicons name="ribbon-outline" size={18} color={colors.brandPurple} style={styles.leftIcon} />
        <Text style={styles.badgesText}>View all badges</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color="#6B6B8D" />
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
          <NotificationBellButton color="#FFFFFF" badgeSize="medium" />
          <Pressable onPress={handleSettings} style={styles.settingsButton} accessibilityRole="button">
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
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
    backgroundColor: '#0A0B1E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0B1E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  content: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  findFriendsButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.35)',
    backgroundColor: 'rgba(17, 10, 58, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  findFriendsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  badgesButton: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ticketPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    gap: 8,
  },
  ticketBadge: {
    backgroundColor: colors.brandPurple,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ticketBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapScrollContent: {
    paddingBottom: 32,
  },
});



