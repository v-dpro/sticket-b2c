import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VenueHeader } from '../../components/venue/VenueHeader';
import { LocationCard } from '../../components/venue/LocationCard';
import { VenueStats } from '../../components/venue/VenueStats';
import { YourVenueHistory } from '../../components/venue/YourVenueHistory';
import { VenueRatings } from '../../components/venue/VenueRatings';
import { RateVenueModal } from '../../components/venue/RateVenueModal';
import { VenueShows } from '../../components/venue/VenueShows';
import { SeatViewsSection } from '../../components/venue/SeatViewsSection';
import { TipsSection } from '../../components/venue/TipsSection';
import { AddTipModal } from '../../components/venue/AddTipModal';
import { AddSeatViewModal } from '../../components/venue/AddSeatViewModal';

import { useVenue } from '../../hooks/useVenue';
import { useVenueTips } from '../../hooks/useVenueTips';
import { useSeatViews } from '../../hooks/useSeatViews';
import { useVenueShows } from '../../hooks/useVenueShows';

import { submitSeatView, submitVenueRatings } from '../../lib/api/venues';
import type { VenueRatingsSubmission, VenueShow } from '../../types/venue';

export default function VenueScreen() {
  const router = useRouter();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const id = venueId ? String(venueId) : '';

  const { venue, loading, error, refetch, updateRatings } = useVenue(id);
  const tips = useVenueTips(id);
  const seatViews = useSeatViews(id);
  const upcoming = useVenueShows(id, true);
  const past = useVenueShows(id, false);

  const [refreshing, setRefreshing] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [addTipVisible, setAddTipVisible] = useState(false);
  const [addSeatViewVisible, setAddSeatViewVisible] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), tips.refresh(), seatViews.refresh(), upcoming.refresh(), past.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    if (!venue) return;

    try {
      await Share.share({
        title: venue.name,
        message: `Check out ${venue.name} on Sticket!`,
        url: `https://sticket.in/venue/${id}`,
      });
    } catch (shareError) {
      // eslint-disable-next-line no-console
      console.error('Share failed:', shareError);
    }
  };

  const handleRateSubmit = async (ratings: VenueRatingsSubmission) => {
    try {
      await submitVenueRatings(id, ratings);
      updateRatings(ratings);
      await refetch();
      return true;
    } catch (submitError) {
      // eslint-disable-next-line no-console
      console.error('Rating submit failed:', submitError);
      return false;
    }
  };

  const handleAddSeatViewSubmit = async (data: { section: string; row?: string; photo: { uri: string } }) => {
    try {
      await submitSeatView(id, data);
      await seatViews.refresh();
      return true;
    } catch (uploadError) {
      // eslint-disable-next-line no-console
      console.error('Seat view upload failed:', uploadError);
      return false;
    }
  };

  const handleShowPress = (eventId: string) => {
    router.push({ pathname: '/event/[eventId]', params: { eventId } });
  };

  const handleLogPress = (show: VenueShow) => {
    router.push({ pathname: '/log/details', params: { eventId: show.id } });
  };

  const handleSeeAllHistory = () => {
    // TODO: navigate to full venue history
  };

  if (loading && !venue) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error || !venue) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Couldn't load venue</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" />}
      >
        <VenueHeader
          name={venue.name}
          imageUrl={venue.imageUrl}
          city={venue.city}
          state={venue.state}
          country={venue.country}
          capacity={venue.capacity}
          onBackPress={handleBack}
          onSharePress={handleShare}
        />

        <VenueStats totalShows={venue.totalShows} totalLogs={venue.totalLogs} capacity={venue.capacity} />

        <YourVenueHistory
          showCount={venue.userShowCount}
          firstShow={venue.userFirstShow}
          lastShow={venue.userLastShow}
          onSeeAllPress={handleSeeAllHistory}
        />

        <LocationCard
          name={venue.name}
          address={venue.address}
          city={venue.city}
          state={venue.state}
          lat={venue.lat}
          lng={venue.lng}
        />

        <VenueRatings ratings={venue.ratings} userHasRated={!!venue.userRatings} onRatePress={() => setRateModalVisible(true)} />

        <VenueShows
          upcoming={upcoming.shows}
          past={past.shows}
          pastLoading={past.loading}
          pastHasMore={past.hasMore}
          onLoadMorePast={past.loadMore}
          onShowPress={handleShowPress}
          onLogPress={handleLogPress}
        />

        <SeatViewsSection
          seatViews={seatViews.seatViews}
          sections={seatViews.sections}
          onAddPress={() => setAddSeatViewVisible(true)}
        />

        <TipsSection tips={tips.tips} onUpvote={tips.toggleUpvote} onAddTipPress={() => setAddTipVisible(true)} />

        <View style={{ height: 100 }} />
      </ScrollView>

      <RateVenueModal
        visible={rateModalVisible}
        onClose={() => setRateModalVisible(false)}
        onSubmit={handleRateSubmit}
        initialRatings={venue.userRatings}
      />

      <AddTipModal
        visible={addTipVisible}
        onClose={() => setAddTipVisible(false)}
        onSubmit={(text, category) => tips.addTip(text, category)}
      />

      <AddSeatViewModal
        visible={addSeatViewVisible}
        onClose={() => setAddSeatViewVisible(false)}
        onSubmit={handleAddSeatViewSubmit}
      />
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



