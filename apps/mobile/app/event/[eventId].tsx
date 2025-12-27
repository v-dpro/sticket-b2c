import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

import { EventHeader } from '../../components/event/EventHeader';
import { EventStats } from '../../components/event/EventStats';
import { EventActions } from '../../components/event/EventActions';
import { FriendsWhoWent } from '../../components/event/FriendsWhoWent';
import { PhotosSection } from '../../components/event/PhotosSection';
import { SetlistSection } from '../../components/event/SetlistSection';
import { MomentsSection } from '../../components/event/MomentsSection';
import { EventComments } from '../../components/event/EventComments';

import { useEvent } from '../../hooks/useEvent';
import { useEventPhotos } from '../../hooks/useEventPhotos';
import { useEventComments } from '../../hooks/useEventComments';
import { markInterested, removeInterested } from '../../lib/api/events';
import { useSession } from '../../hooks/useSession';
import { getLogForUserEvent } from '../../lib/local/repo/logsRepo';
import type { ShareCardData } from '../../types/share';
import { createEventLink } from '../../lib/share/deepLinks';
import { ShareButton } from '../../components/share/ShareButton';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function EventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useSession();

  const id = String(eventId || '');

  const { event, loading, error, refetch, updateInterested } = useEvent(id);
  const { photos, loadMore: loadMorePhotos, hasMore: hasMorePhotos, loading: photosLoading, refresh: refreshPhotos } = useEventPhotos(id);
  const { comments, loading: commentsLoading, posting, addComment, removeComment, refresh: refreshComments } = useEventComments(id);

  const [refreshing, setRefreshing] = useState(false);
  const [localLogId, setLocalLogId] = useState<string | null>(null);
  const goBack = useSafeBack();

  const isPast = useMemo(() => {
    if (!event?.date) return false;
    const dt = new Date(event.date);
    if (Number.isNaN(dt.getTime())) return false;
    return dt < new Date();
  }, [event?.date]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !id) return;
    getLogForUserEvent(user.id, id).then((log) => {
      if (cancelled) return;
      setLocalLogId(log?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const isLogged = !!localLogId || !!event?.userLog;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refreshComments(), refreshPhotos()]);
    setRefreshing(false);
  };

  const handleBack = goBack;

  const shareCardData = useMemo<ShareCardData | null>(() => {
    if (!event) return null;
    return {
      type: 'event',
      event: {
        artistName: event.artist.name,
        artistImage: event.artist.imageUrl || event.imageUrl || undefined,
        venueName: event.venue.name,
        venueCity: event.venue.city,
        date: event.date,
        friendsGoing: (event.friendsInterested?.length ?? 0) + (event.friendsWhoWent?.length ?? 0),
      },
    };
  }, [event]);

  const handleLogPress = () => {
    router.push({ pathname: '/log/details', params: { eventId: id } });
  };

  const handleInterestedPress = async () => {
    if (!event) return;
    try {
      if (event.isInterested) {
        await removeInterested(id);
        updateInterested(false);
      } else {
        await markInterested(id);
        updateInterested(true);
      }
    } catch (toggleError) {
      // eslint-disable-next-line no-console
      console.error('Interest toggle failed:', toggleError);
    }
  };

  const handleFriendPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleSeeAllFriends = () => {
    // Navigate to event page which shows all friends who went
    // The event page already displays friends, so we can scroll to that section
    // For now, just do nothing as the list is already visible on this page
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  if (loading && !event) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{error || 'Event not found'}</Text>
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
        <EventHeader
          imageUrl={event.imageUrl}
          artistName={event.artist.name}
          artistImageUrl={event.artist.imageUrl}
          venueName={event.venue.name}
          venueCity={event.venue.city}
          date={event.date}
          onBackPress={handleBack}
          shareButton={
            shareCardData ? (
              <ShareButton
                data={shareCardData}
                link={createEventLink(id)}
                renderTrigger={(open) => (
                  <Pressable onPress={open} style={styles.headerIconButton} accessibilityRole="button">
                    <BlurView intensity={50} style={styles.headerBlurButton}>
                      <Ionicons name="share-outline" size={22} color="#FFFFFF" />
                    </BlurView>
                  </Pressable>
                )}
              />
            ) : null
          }
        />

        <EventStats logCount={event.logCount} avgRating={event.avgRating} interestedCount={event.interestedCount} />

        <EventActions
          isLogged={isLogged}
          isInterested={event.isInterested}
          ticketUrl={event.ticketUrl}
          isPast={isPast}
          onLogPress={handleLogPress}
          onInterestedPress={handleInterestedPress}
        />

        <FriendsWhoWent friends={event.friendsWhoWent} onFriendPress={handleFriendPress} onSeeAllPress={handleSeeAllFriends} />

        <PhotosSection photos={photos} onLoadMore={loadMorePhotos} hasMore={hasMorePhotos && !photosLoading} />

        <SetlistSection songs={event.setlist ?? []} isUpcoming={!isPast} />

        <MomentsSection moments={event.moments ?? []} />

        <EventComments
          comments={comments}
          loading={commentsLoading}
          posting={posting}
          onAddComment={addComment}
          onDeleteComment={removeComment}
          onUserPress={handleUserPress}
        />
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
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerBlurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#A0A0B8',
    fontSize: 14,
    textAlign: 'center',
  },
});



