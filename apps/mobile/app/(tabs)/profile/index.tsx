import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '../../../components/ui/Avatar';
import { MonoLabel } from '../../../components/ui/MonoLabel';
import { PillButton } from '../../../components/ui/PillButton';
import { ScreenTitle } from '../../../components/ui/ScreenTitle';
import { TimelineView } from '../../../components/profile/TimelineView';
import { ProfileStatsView } from '../../../components/profile/ProfileStatsView';
import { colors, spacing, fonts, radius, fontFamilies } from '../../../lib/theme';
import { useProfile } from '../../../hooks/useProfile';
import { useUserLogs } from '../../../hooks/useUserLogs';
import { useSession } from '../../../hooks/useSession';
import type { LogEntry } from '../../../types/profile';
import type { ShareCardData } from '../../../types/share';
import { ShareButton } from '../../../components/share/ShareButton';
import { createUserLink } from '../../../lib/share/deepLinks';

function StatDivider() {
  return <View style={styles.statDivider} />;
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

type ProfileTab = 'people' | 'concerts' | 'stats';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();

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
      {/* Hero section — avatar + name side-by-side */}
      <View style={styles.heroSection}>
        <Avatar
          uri={profile.avatarUrl}
          size={72}
          name={profile.displayName || profile.username}
          gradientBorder
        />
        <View style={styles.heroInfo}>
          <MonoLabel size={10} color={colors.brandCyan}>
            {`${profile.stats.followers ?? 0} FRIENDS \u00B7 ${profile.stats.shows} SHOWS`}
          </MonoLabel>
          <Text style={styles.displayName}>
            {profile.displayName || profile.username}.
          </Text>
        </View>
      </View>

      {profile.bio ? (
        <Text style={styles.bio}>{profile.bio}</Text>
      ) : null}

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

      {/* Stats strip with vertical dividers */}
      <View style={styles.statsStrip}>
        <Stat value={profile.stats.followers ?? 0} label="FRIENDS" color={colors.brandCyan} />
        <StatDivider />
        <Stat value={profile.stats.shows} label="SHOWS" color={colors.brandCyan} />
        <StatDivider />
        <Stat value={profile.stats.artists} label="ARTISTS" color={colors.brandPurple} />
        <StatDivider />
        <Stat value={profile.stats.venues} label="VENUES" color={colors.brandPink} />
      </View>

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
                { borderBottomColor: isActive ? colors.brandCyan : 'transparent' },
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header row */}
      <ScreenTitle
        eyebrow="PROFILE"
        eyebrowColor={colors.brandPink}
        title={profile?.displayName || profile?.username || ''}
        right={
          <View style={styles.headerActions}>
            <ShareButton data={statsShareData} link={createUserLink(profile.username)} />
            <Pressable onPress={handleSettings} style={styles.settingsButton} accessibilityRole="button">
              <Ionicons name="settings-outline" size={16} color={colors.textHi} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.content}>
        {activeTab === 'stats' ? (
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
    fontFamily: fontFamilies.uiSemi,
    color: colors.textHi,
    fontSize: fonts.bodySmall,
  },

  // Header row
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
  },

  // Hero section — row layout
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    paddingTop: spacing.sm,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  heroInfo: {
    flex: 1,
  },
  displayName: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 36,
    letterSpacing: -0.8,
    color: colors.textHi,
    marginTop: 4,
  },
  bio: {
    fontFamily: fontFamilies.ui,
    fontSize: 13,
    color: colors.textMid,
    lineHeight: 13 * 1.5,
    marginTop: spacing.sm,
    paddingHorizontal: 20,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // Stats strip with dividers
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 18,
    marginHorizontal: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 36,
    letterSpacing: -1,
    color: colors.textHi,
  },
  statLabel: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.hairline,
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
    fontFamily: fontFamilies.monoSemi,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  content: {
    flex: 1,
  },

});
