import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '../../../components/ui/Avatar';
import { MonoLabel } from '../../../components/ui/MonoLabel';
import { StatPill } from '../../../components/ui/StatPill';
import { XpBar } from '../../../components/ui/XpBar';
import { PillButton } from '../../../components/ui/PillButton';
import { ViewToggle, type ViewMode } from '../../../components/profile/ViewToggle';
import { TimelineView } from '../../../components/profile/TimelineView';
import { ProfileMapView } from '../../../components/profile/MapView';
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
        <Ionicons name="chevron-forward" size={20} color={colors.textLo} />
      </View>
    </Pressable>
  );
}

type ProfileTab = 'people' | 'concerts' | 'stats';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('concerts');

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

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'people', label: 'My People' },
    { key: 'concerts', label: 'Concert Life' },
    { key: 'stats', label: 'Stats' },
  ];

  const headerBlock = (
    <View>
      {/* Hero section */}
      <View style={styles.heroSection}>
        <Avatar
          uri={profile.avatarUrl}
          size={72}
          name={profile.displayName || profile.username}
          gradientBorder
        />

        <Text style={styles.displayName}>
          {profile.displayName || profile.username}
        </Text>

        <MonoLabel size={10} color={colors.brandCyan}>
          Opener
        </MonoLabel>

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <PillButton
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="ghost"
          size="sm"
        />
        <PillButton
          title="Share"
          onPress={() => {}}
          variant="ghost"
          size="sm"
          icon={<Ionicons name="share-outline" size={14} color={colors.textHi} />}
        />
      </View>

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        <StatPill value={profile.stats.followers ?? 0} label="Friends" />
        <StatPill value={profile.stats.shows} label="Shows" />
        <StatPill
          value={profile.stats.artists}
          label="Artists"
          color={colors.brandPurple}
        />
        <StatPill
          value={profile.stats.venues}
          label="Venues"
          color={colors.brandPink}
        />
      </View>

      {/* XP Bar */}
      <View style={styles.xpBarContainer}>
        <XpBar xp={0} showLabel={true} />
      </View>

      <TicketPreview />

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                { borderBottomColor: isActive ? colors.brandPink : 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.textHi : colors.textLo },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* View Toggle (within Concert Life tab) */}
      {activeTab === 'concerts' && (
        <ViewToggle value={viewMode} onChange={setViewMode} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header row */}
      <View style={styles.header}>
        <MonoLabel size={11} color={colors.textLo}>
          {`@${profile.username}`}
        </MonoLabel>
        <View style={styles.headerActions}>
          <ShareButton data={statsShareData} link={createUserLink(profile.username)} />
          <Pressable onPress={handleSettings} style={styles.settingsButton} accessibilityRole="button">
            <Ionicons name="settings-outline" size={16} color={colors.textHi} />
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
    backgroundColor: colors.ink,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
    color: colors.textHi,
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
    color: colors.textHi,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.semibold,
  },

  // Header row
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  displayName: {
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: -0.8,
    color: colors.textHi,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: colors.textMid,
    lineHeight: 13 * 1.5,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    marginHorizontal: spacing.md,
  },

  // XP Bar
  xpBarContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // Tab selector
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  content: {
    flex: 1,
  },

  // Ticket preview (kept from original)
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
    borderColor: colors.hairline,
  },
  ticketPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: radius.md,
  },
  ticketPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHi,
  },
  ticketPreviewSub: {
    fontSize: 13,
    color: colors.textMid,
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
    color: colors.textHi,
    fontSize: fonts.caption,
    fontWeight: fonts.bold,
  },
  mapScrollContent: {
    paddingBottom: spacing.xl,
  },
});
