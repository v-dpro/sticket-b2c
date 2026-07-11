// Event entity page — breadcrumb → header → your-log/interested actions →
// who went → crowd memories → spoiler-shielded setlist → presales →
// compact comments.
//
// APIs: GET /events/:id (detail incl. userLog/friends/interested) ·
// POST/DELETE /events/:id/interested · GET /events/:id/photos ·
// GET /events/:id/setlist · GET /presales?artistId= (matched client-side) ·
// GET/POST /events/:id/comments.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CommentsBlock } from '../../components/entity/CommentsBlock';
import { EntityNav } from '../../components/entity/EntityChrome';
import { Facepile, QuietEmpty, SectionLabel } from '../../components/entity/EntityBits';
import { EntityError, EntityPageSkeleton } from '../../components/entity/EntityStates';
import { isPast, monoDateYear, sameDay } from '../../components/entity/format';
import { PhotoGrid } from '../../components/entity/PhotoGrid';
import { PresaleCard } from '../../components/entity/PresaleCard';
import { SetlistShield } from '../../components/entity/SetlistShield';
import { ScoreChip } from '../../components/timeline/ScoreChip';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

import { useEvent } from '../../hooks/useEvent';
import { useEventComments } from '../../hooks/useEventComments';
import { useEventPhotos } from '../../hooks/useEventPhotos';
import {
  getArtistPresales,
  getSetlist,
  markInterested,
  removeInterested,
  type EventPresale,
} from '../../lib/api/events';
import { haptics } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { SetlistSong } from '../../types/event';

export default function EventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{
    eventId: string;
    tourId?: string;
    tourName?: string;
  }>();
  const id = params.eventId ? String(params.eventId) : '';
  const tourName = params.tourName ? String(params.tourName) : '';
  const tourId = params.tourId ? String(params.tourId) : '';

  const { event, loading, error, refetch, updateInterested } = useEvent(id);
  const photosState = useEventPhotos(id);
  const commentsState = useEventComments(id);

  const [refreshing, setRefreshing] = useState(false);
  const [interestedBusy, setInterestedBusy] = useState(false);
  const [setlistSongs, setSetlistSongs] = useState<SetlistSong[]>([]);
  const [presales, setPresales] = useState<EventPresale[]>([]);

  // Setlist — the detail payload is used first; the dedicated endpoint
  // fills in when the detail carries none.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void getSetlist(id)
      .then((data) => {
        if (!alive) return;
        const songs = Array.isArray(data?.songs) ? data.songs : Array.isArray(data) ? data : [];
        setSetlistSongs(songs);
      })
      .catch(() => {
        // setlist is optional — section is simply omitted
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Presales — no per-event endpoint exists; fetch the artist's presales
  // and match this event by same-day date + venue name/city.
  const loadPresales = useCallback(async () => {
    if (!event) return;
    try {
      const rows = await getArtistPresales(event.artist.id);
      const venueName = event.venue.name?.toLowerCase() ?? '';
      const venueCity = event.venue.city?.toLowerCase() ?? '';
      const matches = rows.filter((p) => {
        if (!sameDay(p.eventDate, event.date)) return false;
        const pName = p.venueName?.toLowerCase() ?? '';
        const pCity = p.venueCity?.toLowerCase() ?? '';
        return (
          (pCity.length > 0 && pCity === venueCity) ||
          (pName.length > 0 &&
            venueName.length > 0 &&
            (pName === venueName || pName.includes(venueName) || venueName.includes(pName)))
        );
      });
      setPresales(matches);
    } catch {
      setPresales([]);
    }
  }, [event]);

  useEffect(() => {
    void loadPresales();
  }, [loadPresales]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        photosState.refresh(),
        commentsState.refresh(),
        loadPresales(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.name,
        message: `${event.artist.name} at ${event.venue.name} — https://sticket.in/event/${id}`,
        url: `https://sticket.in/event/${id}`,
      });
    } catch {
      // sheet dismissed
    }
  };

  const handleInterested = async () => {
    if (!event || interestedBusy) return;
    const next = !event.isInterested;
    setInterestedBusy(true);
    updateInterested(next); // optimistic
    try {
      if (next) await markInterested(id);
      else await removeInterested(id);
      haptics.medium();
    } catch {
      updateInterested(!next); // rollback
      haptics.error();
    } finally {
      setInterestedBusy(false);
    }
  };

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    content: { paddingHorizontal: t.density.pad },
    crumbRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 14,
    },
    crumb: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    crumbSep: { fontSize: 13, color: t.colors.muteSoft },
    title: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 8,
      lineHeight: 27,
    },
    metaLine: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11.5,
      letterSpacing: 0.4,
      color: t.colors.mute,
      marginTop: 8,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      flexWrap: 'wrap',
    },
    section: { marginTop: 28 },
    whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    whoCounts: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.6,
      color: t.colors.mute,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
  }));

  if (loading && !event) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingTop: insets.top }}>
          <EntityNav onBack={goBack} />
        </View>
        <EntityPageSkeleton hero={false} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <EntityError
          title="Couldn't load this show"
          message={error}
          onRetry={() => void refetch()}
          onBack={goBack}
        />
      </View>
    );
  }

  const past = isPast(event.date);
  const userLog = event.userLog ?? null;
  const songs = event.setlist?.length ? event.setlist : setlistSongs;
  const whoWentPeople = event.friendsWhoWent ?? [];
  const interestedPeople = event.friendsInterested ?? [];
  const facepilePeople = whoWentPeople.length ? whoWentPeople : interestedPeople;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} onShare={() => void handleShare()} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={tokens.colors.mute}
              colors={[tokens.colors.fg]}
              progressBackgroundColor={tokens.colors.card2}
            />
          }
        >
          <View style={styles.content}>
            {/* ── Breadcrumb ── */}
            <View style={styles.crumbRow}>
              <SpringPressable
                haptic="light"
                onPress={() =>
                  router.push({
                    pathname: '/artist/[artistId]',
                    params: { artistId: event.artist.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Go to ${event.artist.name}`}
              >
                <Text style={styles.crumb}>{event.artist.name}</Text>
              </SpringPressable>
              {tourName ? (
                <>
                  <Text style={styles.crumbSep}>›</Text>
                  <SpringPressable
                    haptic="light"
                    disabled={!tourId}
                    shakeWhenDisabled={false}
                    onPress={() =>
                      router.push({
                        pathname: '/tour/[tourId]',
                        params: {
                          tourId,
                          tourName,
                          artistId: event.artist.id,
                          artistName: event.artist.name,
                        },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Go to ${tourName}`}
                  >
                    <Text style={styles.crumb}>{tourName}</Text>
                  </SpringPressable>
                </>
              ) : null}
            </View>

            {/* ── Header ── */}
            <Text style={styles.title}>{event.name}</Text>
            <SpringPressable
              haptic="light"
              onPress={() =>
                router.push({
                  pathname: '/venue/[venueId]',
                  params: { venueId: event.venue.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Go to ${event.venue.name}`}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={styles.metaLine}>
                {event.venue.name.toUpperCase()}, {event.venue.city.toUpperCase()} ·{' '}
                {monoDateYear(event.date)}
              </Text>
            </SpringPressable>

            {/* ── Action row ── */}
            <View style={styles.actionRow}>
              {userLog ? (
                <>
                  {typeof userLog.rating === 'number' ? <ScoreChip score={userLog.rating} /> : null}
                  <PillButton
                    title="View your memory"
                    variant="secondary"
                    springFeedback
                    haptic="light"
                    onPress={() => router.push(`/log/${userLog.id}`)}
                  />
                </>
              ) : (
                <PillButton
                  title="Log this show"
                  variant="primary"
                  springFeedback
                  haptic="light"
                  onPress={() =>
                    router.push({ pathname: '/log/details', params: { eventId: id } })
                  }
                />
              )}
              <PillButton
                title="Interested"
                variant="secondary"
                springFeedback
                haptic="light"
                disabled={interestedBusy}
                icon={
                  <Ionicons
                    name={event.isInterested ? 'star' : 'star-outline'}
                    size={13}
                    color={event.isInterested ? tokens.colors.accent : tokens.colors.mute}
                  />
                }
                onPress={() => void handleInterested()}
              />
            </View>

            {/* ── Who went ── */}
            <View style={styles.section}>
              <SectionLabel>{past ? 'Who went' : "Who's going"}</SectionLabel>
              {facepilePeople.length === 0 &&
              event.logCount === 0 &&
              event.interestedCount === 0 ? (
                <QuietEmpty
                  text={
                    past
                      ? 'No one has logged this show yet — be the first.'
                      : 'No one has raised a hand yet — be the first.'
                  }
                />
              ) : (
                <Animated.View entering={FadeInDown.duration(240)} style={styles.whoRow}>
                  {facepilePeople.length > 0 ? <Facepile people={facepilePeople} /> : null}
                  <Text style={styles.whoCounts}>
                    {event.logCount} logged · {event.interestedCount} interested
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* ── Crowd memories ── */}
            <View style={styles.section}>
              <SectionLabel>Crowd memories</SectionLabel>
              {photosState.photos.length > 0 ? (
                <PhotoGrid photos={photosState.photos} />
              ) : (
                <QuietEmpty
                  text={
                    past
                      ? 'No photos from the crowd yet.'
                      : 'Photos land here once the night happens.'
                  }
                />
              )}
            </View>

            {/* ── Setlist (only when data exists; spoiler-shielded) ── */}
            {songs.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>Setlist</SectionLabel>
                <SetlistShield songs={songs} />
              </View>
            ) : null}

            {/* ── Presales (only when matched) ── */}
            {presales.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>Presales</SectionLabel>
                <PresaleCard presales={presales} />
              </View>
            ) : null}

            {/* ── Comments ── */}
            <View style={styles.section}>
              <SectionLabel>Comments</SectionLabel>
              <CommentsBlock
                comments={commentsState.comments}
                posting={commentsState.posting}
                onPost={commentsState.addComment}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
