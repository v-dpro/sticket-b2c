import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { useLogDetail } from '../../hooks/useLogDetail';
import { ShareButton } from '../../components/share/ShareButton';
import { createLogLink } from '../../lib/share/deepLinks';
import type { ShareCardData } from '../../types/share';

import { FeedCardHeader } from '../../components/feed/FeedCardHeader';
import { FeedCardContent } from '../../components/feed/FeedCardContent';
import { FeedCardPhotos } from '../../components/feed/FeedCardPhotos';
import { FeedCardActions } from '../../components/feed/FeedCardActions';
import { CommentInput } from '../../components/feed/CommentInput';
import { Avatar } from '../../components/ui/Avatar';

export default function LogDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, loading, refreshing, error, refresh, submitComment, toggleWasThere } = useLogDetail(id || '');

  const shareCardData = useMemo<ShareCardData | null>(() => {
    if (!data) return null;
    return {
      type: 'log',
      log: {
        artistName: data.event.artist.name,
        artistImage: data.event.artist.imageUrl || undefined,
        venueName: data.event.venue.name,
        venueCity: data.event.venue.city,
        date: data.event.date,
        rating: data.log.rating ?? undefined,
        photo: data.log.photos?.[0]?.photoUrl || undefined,
      },
    };
  }, [data]);

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          title: 'Log',
          headerShown: true,
          headerTitleStyle: { color: colors.textPrimary },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerRight: () =>
            shareCardData ? <ShareButton data={shareCardData} link={createLogLink(String(id || ''))} /> : null,
        }}
      />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
          <Text style={styles.mutedText}>Loading log…</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.mutedText, { textAlign: 'center' }]}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : !data ? null : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPurple} colors={[colors.brandPurple]} />}
          >
            <View style={{ paddingHorizontal: 16, paddingTop: spacing.lg }}>
              <FeedCardHeader user={data.user} createdAt={data.createdAt} onUserPress={() => router.push({ pathname: '/profile/[id]', params: { id: data.user.id } })} />

              <FeedCardContent
                event={data.event}
                rating={data.log.rating}
                note={data.log.note}
                onEventPress={() => router.push({ pathname: '/event/[eventId]', params: { eventId: data.event.id } })}
                onArtistPress={() => router.push({ pathname: '/artist/[artistId]', params: { artistId: data.event.artist.id } })}
                onVenuePress={() => router.push({ pathname: '/venue/[venueId]', params: { venueId: data.event.venue.id } })}
              />
            </View>

            {data.log.photos?.length ? <FeedCardPhotos photos={data.log.photos} onPress={() => {}} /> : null}

            <View style={{ paddingHorizontal: 16 }}>
              <FeedCardActions
                wasThereCount={data.wasThereCount}
                userWasThere={data.userWasThere}
                commentCount={data.commentCount}
                onWasTherePress={() => void toggleWasThere(data.userWasThere)}
                onCommentPress={() => {
                  // noop: input is always visible on this screen
                }}
              />
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <Text style={styles.sectionTitle}>Comments</Text>

              {data.allComments?.length ? (
                <View style={{ gap: 12, marginTop: 10 }}>
                  {data.allComments.map((c) => (
                    <View key={c.id} style={styles.commentRow}>
                      <Avatar uri={c.user.avatarUrl} name={c.user.displayName || c.user.username} size={32} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.commentHeader}>
                          <Text style={styles.commentUsername}>@{c.user.username}</Text>
                          <Text style={styles.commentText}>  {c.text}</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>No comments yet.</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.commentInputDock}>
            <CommentInput
              onCancel={() => {
                // keep docked; act like clear
              }}
              onSubmit={async (text) => {
                await submitComment(text);
              }}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  mutedText: {
    color: colors.textSecondary,
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
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  commentHeader: {
    color: colors.textPrimary,
  },
  commentUsername: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  commentText: {
    color: colors.textSecondary,
  },
  commentInputDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});



