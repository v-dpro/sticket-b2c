import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ViewToggle, type ViewMode } from '../../components/profile/ViewToggle';
import { TimelineView } from '../../components/profile/TimelineView';
import { ProfileMapView } from '../../components/profile/MapView';
import { BadgeGrid } from '../../components/profile/BadgeGrid';
import { StatsRow } from '../../components/profile/StatsRow';
import { ProfileGridView } from '../../components/profile/ProfileGridView';
import { ProfileStatsView } from '../../components/profile/ProfileStatsView';
import { useProfile } from '../../hooks/useProfile';
import { useUserLogs } from '../../hooks/useUserLogs';
import { useFollow } from '../../hooks/useFollow';
import type { LogEntry } from '../../types/profile';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const { profile, loading: profileLoading } = useProfile(id);
  const { logs, years, loading: logsLoading, hasMore, loadMore, refresh } = useUserLogs(id || '', selectedYear || undefined);

  const { isFollowing, setIsFollowing, toggleFollow, loading: followLoading } = useFollow();
  const goBack = useSafeBack();

  // Sync follow state when profile loads
  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing || false);
    }
  }, [profile, setIsFollowing]);

  const handleBack = goBack;

  const handleFollowPress = () => {
    if (id) {
      void toggleFollow(id);
    }
  };

  const handleFollowers = () => {
    router.push({ pathname: '/followers', params: { userId: id } });
  };

  const handleFollowing = () => {
    router.push({ pathname: '/following', params: { userId: id } });
  };

  const handleLogPress = (log: LogEntry) => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: log.event.id } });
  };

  const handleVenuePress = (venueId: string) => {
    router.push({ pathname: '/venue/[venueId]', params: { venueId } });
  };

  if (profileLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Check privacy
  if (profile.privacySetting === 'PRIVATE' && !profile.isOwnProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.privateContainer}>
          <Ionicons name="lock-closed" size={64} color="#6B6B8D" />
          <Text style={styles.privateTitle}>This account is private</Text>
          <Text style={styles.privateText}>Follow to see their shows</Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerBlock = (
    <View>
      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        onFollowPress={handleFollowPress}
        onFollowersPress={handleFollowers}
        onFollowingPress={handleFollowing}
        isFollowing={isFollowing}
        followLoading={followLoading}
      />

      {/* Stats */}
      <StatsRow shows={profile.stats.shows} artists={profile.stats.artists} venues={profile.stats.venues} />

      {/* Badges */}
      <BadgeGrid badges={profile.badges} />

      {/* View Toggle */}
      <ViewToggle value={viewMode} onChange={setViewMode} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
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
          <ProfileMapView userId={id || ''} onVenuePress={handleVenuePress} />
        </ScrollView>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  privateText: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 8,
  },
  mapScrollContent: {
    paddingBottom: 32,
  },
});




