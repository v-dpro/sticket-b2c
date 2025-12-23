import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Text,
  Pressable,
} from 'react-native';

import { ArtistHeader } from '../../components/artist/ArtistHeader';
import { ArtistStats } from '../../components/artist/ArtistStats';
import { YourHistory } from '../../components/artist/YourHistory';
import { UpcomingShows } from '../../components/artist/UpcomingShows';
import { PastShows } from '../../components/artist/PastShows';
import { FriendsWhoSaw } from '../../components/artist/FriendsWhoSaw';

import { useArtist } from '../../hooks/useArtist';
import { useArtistShows } from '../../hooks/useArtistShows';
import { useArtistFollow } from '../../hooks/useArtistFollow';

import { markInterested, removeInterested } from '../../lib/api/events';
import type { ArtistShow } from '../../types/artist';

export default function ArtistScreen() {
  const router = useRouter();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();

  const id = artistId ? String(artistId) : '';

  const { artist, loading, error, refetch, updateFollowing } = useArtist(id);
  const { isFollowing, setIsFollowing, toggleFollow, loading: followLoading } = useArtistFollow();

  const upcoming = useArtistShows(id, true);
  const past = useArtistShows(id, false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (artist) {
      setIsFollowing(artist.isFollowing);
    }
  }, [artist, setIsFollowing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), upcoming.refresh(), past.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    if (!artist) return;
    try {
      await Share.share({
        title: artist.name,
        message: `Check out ${artist.name} on Sticket!`,
        url: `https://sticket.in/artist/${id}`,
      });
    } catch (shareError) {
      console.error('Share failed:', shareError);
    }
  };

  const handleFollowPress = async () => {
    if (!id) return;
    await toggleFollow(id);
    updateFollowing(!isFollowing);
  };

  const handleShowPress = (showId: string) => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: showId } });
  };

  const handleInterestedPress = async (showId: string, current: boolean) => {
    try {
      if (current) {
        await removeInterested(showId);
      } else {
        await markInterested(showId);
      }
      upcoming.updateInterested(showId, !current);
    } catch (interestError) {
      console.error('Interest toggle failed:', interestError);
    }
  };

  const handleLogPress = (show: ArtistShow) => {
    router.push({ pathname: '/log/details', params: { eventId: show.id } });
  };

  const handleFriendPress = (userId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: userId } });
  };

  const handleSeeAllHistory = () => {
    // TODO: Navigate to a full history screen
  };

  if (loading && !artist) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Couldn't load artist</Text>
        <Text style={styles.errorSubtitle}>{error || 'Unknown error'}</Text>
        <Pressable style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" />
        }
      >
        <ArtistHeader
          name={artist.name}
          imageUrl={artist.imageUrl}
          genres={artist.genres}
          isFollowing={isFollowing}
          followLoading={followLoading}
          spotifyUrl={artist.spotifyUrl}
          appleMusicUrl={artist.appleMusicUrl}
          onBackPress={handleBack}
          onFollowPress={handleFollowPress}
          onSharePress={handleShare}
        />

        <ArtistStats followerCount={artist.followerCount} totalLogs={artist.totalLogs} avgRating={artist.avgRating} />

        <YourHistory
          showCount={artist.userShowCount}
          firstShow={artist.userFirstShow}
          lastShow={artist.userLastShow}
          onSeeAllPress={handleSeeAllHistory}
        />

        <FriendsWhoSaw friends={artist.friendsWhoSaw} onFriendPress={handleFriendPress} />

        <UpcomingShows shows={upcoming.shows} onShowPress={handleShowPress} onInterestedPress={handleInterestedPress} />

        <PastShows
          shows={past.shows}
          loading={past.loading}
          hasMore={past.hasMore}
          onLoadMore={past.loadMore}
          onShowPress={handleShowPress}
          onLogPress={handleLogPress}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1E',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0B1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0B1E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#A0A0B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#00D4FF',
    fontWeight: '700',
  },
});



