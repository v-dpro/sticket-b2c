// Event entity page — breadcrumb → header → your-log/interested actions →
// who went → FROM THE CROWD (FeedCards → full crowd feed) → SEAT VIEWS
// (section tile map → per-section sheet) → spoiler-shielded crowd setlist
// (confirm/dispute votes) → FIND TICKETS (future shows) → presales →
// PARTIES (host-run meetups) → compact comments.
//
// APIs: GET /events/:id (detail incl. userLog/friends/interested) ·
// POST/DELETE /events/:id/interested · GET /events/:id/feed (crowd posts) ·
// GET /events/:id/seat-sections · GET /events/:id/photos (grid fallback) ·
// GET /events/:id/setlist (crowd entries) · POST /setlist-entries/:id/confirm ·
// GET /presales?artistId= (matched client-side) · GET /events/:id/parties ·
// GET/POST /events/:id/comments.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
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
import { QuietEmpty, SectionLabel } from '../../components/entity/EntityBits';
import { EntityError, EntityPageSkeleton, ShimmerBlock } from '../../components/entity/EntityStates';
import { formatScore, isPast, monoDateYear, sameDay } from '../../components/entity/format';
import { PhotoGrid } from '../../components/entity/PhotoGrid';
import { PresaleCard } from '../../components/entity/PresaleCard';
import { SeatSectionSheet } from '../../components/entity/SeatSectionSheet';
import { SeatSectionTiles } from '../../components/entity/SeatSectionTiles';
import { SetlistShield } from '../../components/entity/SetlistShield';
import { PartyRow } from '../../components/party/PartyRow';
import { FeedCard } from '../../components/feed/FeedCard';
import { DegreeFacepile } from '../../components/ui/DegreeFacepile';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { ScoreStamp, StubDetailsRow, StubPerforation } from '../../components/ui/Stub';

import { useEvent } from '../../hooks/useEvent';
import { useEventComments } from '../../hooks/useEventComments';
import { useEventPhotos } from '../../hooks/useEventPhotos';
import { useSession } from '../../hooks/useSession';
import {
  getArtistPresales,
  getEventFeed,
  getEventSeatSections,
  getSetlist,
  markInterested,
  removeInterested,
  voteSetlistEntry,
  type EventPresale,
  type EventSeatSection,
  type SetlistEntry,
} from '../../lib/api/events';
import { getEventParties, type Party } from '../../lib/api/parties';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { FeedItem } from '../../types/feed';

type AsyncStatus = 'loading' | 'ready' | 'error';

/** First N crowd posts shown inline before "See all →". */
const CROWD_PREVIEW_COUNT = 3;

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
  const { user } = useSession();
  const photosState = useEventPhotos(id);
  const commentsState = useEventComments(id);

  const [refreshing, setRefreshing] = useState(false);
  const [interestedBusy, setInterestedBusy] = useState(false);
  const [setlistEntries, setSetlistEntries] = useState<SetlistEntry[]>([]);
  const [presales, setPresales] = useState<EventPresale[]>([]);

  // Parties — host-run pre/post-show meetups for this event.
  const [parties, setParties] = useState<Party[]>([]);
  const [partiesStatus, setPartiesStatus] = useState<AsyncStatus>('loading');

  // From the crowd — first page of the event's public memory posts.
  const [crowd, setCrowd] = useState<FeedItem[]>([]);
  const [crowdStatus, setCrowdStatus] = useState<AsyncStatus>('loading');

  // Seat views — photos grouped by section.
  const [seatSections, setSeatSections] = useState<EventSeatSection[]>([]);
  const [seatStatus, setSeatStatus] = useState<AsyncStatus>('loading');
  const [openSection, setOpenSection] = useState<EventSeatSection | null>(null);

  const loadCrowd = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getEventFeed(id, { limit: CROWD_PREVIEW_COUNT });
      setCrowd(Array.isArray(res?.items) ? res.items : []);
      setCrowdStatus('ready');
    } catch {
      // Endpoint unavailable — the section falls back to the photo grid.
      setCrowd([]);
      setCrowdStatus('error');
    }
  }, [id]);

  const loadSeatSections = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getEventSeatSections(id);
      setSeatSections(Array.isArray(res?.sections) ? res.sections : []);
      setSeatStatus('ready');
    } catch {
      setSeatSections([]);
      setSeatStatus('error');
    }
  }, [id]);

  const loadParties = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getEventParties(id);
      setParties(Array.isArray(res?.parties) ? res.parties : []);
      setPartiesStatus('ready');
    } catch {
      setParties([]);
      setPartiesStatus('error');
    }
  }, [id]);

  useEffect(() => {
    setCrowdStatus('loading');
    setSeatStatus('loading');
    setPartiesStatus('loading');
    void loadCrowd();
    void loadSeatSections();
    void loadParties();
  }, [loadCrowd, loadSeatSections, loadParties]);

  // Setlist — crowd-sourced entries (the detail payload's `setlist` is a
  // legacy stub, so the dedicated endpoint is the source of truth).
  const loadSetlist = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSetlist(id);
      setSetlistEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch {
      // setlist is optional — section is simply omitted
    }
  }, [id]);

  useEffect(() => {
    void loadSetlist();
  }, [loadSetlist]);

  // Confirm/dispute one setlist entry — server returns the updated entry
  // (net confirmCount + your vote), which replaces the row in place.
  const handleSetlistVote = useCallback(async (entryId: string, vote: 'yes' | 'no') => {
    try {
      const updated = await voteSetlistEntry(entryId, vote);
      setSetlistEntries((prev) =>
        prev.map((e) =>
          e.id === updated.id
            ? { ...e, confirmCount: updated.confirmCount, yourVote: updated.yourVote }
            : e,
        ),
      );
    } catch {
      haptics.error();
    }
  }, []);

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
        loadCrowd(),
        loadSeatSections(),
        loadParties(),
        loadSetlist(),
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
    crumb: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    crumbSep: { fontFamily: t.fontFamilies.mono, fontSize: 11, color: t.colors.muteSoft },
    title: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 8,
      lineHeight: 29,
    },
    metaLine: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11.5,
      letterSpacing: 0.4,
      color: t.colors.mute,
      marginTop: 8,
    },
    // Header stats line — numbers fg 700 mono, labels muteSoft.
    statsLine: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 10,
    },
    statNum: { color: t.colors.fg, fontWeight: '700' },
    // YOUR NIGHT — the one stub on this page (C3: the user's own logged
    // night). Perforation notches punch through to the page bg.
    stubCard: {
      marginTop: 18,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.stub,
      borderWidth: 1,
      borderColor: t.colors.line,
      overflow: 'hidden',
      ...t.shadows.card,
    },
    stubBody: { paddingHorizontal: t.density.cardPad, paddingTop: t.density.cardPad, paddingBottom: 14 },
    stubTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    stubEyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    stubTitle: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: t.colors.fg,
      marginTop: 6,
    },
    stubFooter: { paddingHorizontal: t.density.cardPad, paddingVertical: 12 },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      flexWrap: 'wrap',
    },
    section: { marginTop: 28 },
    ticketPillRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    partyList: { gap: 10 },
    partyEmptyText: { fontSize: 13, color: t.colors.mute, lineHeight: 19 },
    hostPillRow: { flexDirection: 'row', marginTop: 12 },
    crowdCard: { paddingBottom: 22 },
    seeAllRow: { flexDirection: 'row', marginTop: 2 },
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
  const whoWentPeople = event.friendsWhoWent ?? [];
  const interestedPeople = event.friendsInterested ?? [];
  const facepilePeople = whoWentPeople.length ? whoWentPeople : interestedPeople;

  // Who-went caption — degree-1 (friends) vs degree-2 (friends-of-friends)
  // counted from the same people the facepile renders; falls back to the
  // raw logged/interested tally when neither degree is represented.
  const whoFriendsCount = facepilePeople.filter((p) => p.degree === 1).length;
  const whoOrbitCount = facepilePeople.filter((p) => p.degree === 2).length;
  const whoVerb = past ? 'WENT' : 'GOING';
  const whoCountsText =
    whoFriendsCount > 0 || whoOrbitCount > 0
      ? [
          whoFriendsCount > 0 ? `${whoFriendsCount} FRIEND${whoFriendsCount === 1 ? '' : 'S'}` : null,
          whoOrbitCount > 0 ? `${whoOrbitCount} FRIEND${whoOrbitCount === 1 ? '' : 'S'}+` : null,
        ]
          .filter(Boolean)
          .join(' · ') + ` ${whoVerb}`
      : `${event.logCount} logged · ${event.interestedCount} interested`;

  // Header stats — "8.4 AVG · 214 LOGS · 36 INTERESTED".
  const statBits: { num: string; label: string }[] = [];
  if (typeof event.avgRating === 'number' && Number.isFinite(event.avgRating)) {
    statBits.push({ num: formatScore(event.avgRating), label: 'AVG' });
  }
  if (event.logCount > 0) {
    statBits.push({ num: String(event.logCount), label: event.logCount === 1 ? 'LOG' : 'LOGS' });
  }
  if (event.interestedCount > 0) {
    statBits.push({ num: String(event.interestedCount), label: 'INTERESTED' });
  }

  // Stub details strip — seat refs when the log carries them, else the date.
  const stubDetails = userLog
    ? [
        userLog.section ? `SEC ${userLog.section}` : null,
        userLog.row ? `ROW ${userLog.row}` : null,
        userLog.seat ? `SEAT ${userLog.seat}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || monoDateYear(event.date)
    : '';

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
            {/* ── Breadcrumb — "‹ ARTIST › TOUR" ── */}
            <View style={styles.crumbRow}>
              <Text style={styles.crumbSep}>‹</Text>
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
            {statBits.length > 0 ? (
              <Text style={styles.statsLine}>
                {statBits.map((bit, i) => (
                  <React.Fragment key={bit.label}>
                    {i > 0 ? ' · ' : ''}
                    <Text style={styles.statNum}>{bit.num}</Text>
                    {` ${bit.label}`}
                  </React.Fragment>
                ))}
              </Text>
            ) : null}

            {/* ── Your night — logged shows get the stub (C3); the tap keeps
                   the same route to the memory. ── */}
            {userLog ? (
              <SpringPressable
                haptic="light"
                onPress={() => router.push(`/log/${userLog.id}`)}
                accessibilityRole="button"
                accessibilityLabel="View your memory"
                style={styles.stubCard}
              >
                <View style={styles.stubBody}>
                  <View style={styles.stubTopRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.stubEyebrow}>Your night</Text>
                      <Text style={styles.stubTitle}>Logged — view your memory</Text>
                    </View>
                    {typeof userLog.rating === 'number' ? (
                      <ScoreStamp score={userLog.rating} size={16} />
                    ) : null}
                  </View>
                </View>
                <StubPerforation notchColor={tokens.colors.bg} />
                <View style={styles.stubFooter}>
                  <StubDetailsRow left={stubDetails} right="VIEW →" />
                </View>
              </SpringPressable>
            ) : null}

            {/* ── Action row ── */}
            <View style={styles.actionRow}>
              {!userLog ? (
                <PillButton
                  title="Log this show"
                  variant="primary"
                  springFeedback
                  haptic="light"
                  onPress={() =>
                    router.push({ pathname: '/log/details', params: { eventId: id } })
                  }
                />
              ) : null}
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
                    color={event.isInterested ? tokens.colors.fg : tokens.colors.mute}
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
                  {facepilePeople.length > 0 ? (
                    <DegreeFacepile people={facepilePeople} surfaceColor={tokens.colors.bg} />
                  ) : null}
                  <Text style={styles.whoCounts}>{whoCountsText}</Text>
                </Animated.View>
              )}
            </View>

            {/* ── From the crowd ── */}
            <View style={styles.section}>
              <SectionLabel>From the crowd</SectionLabel>
              {crowdStatus === 'loading' ? (
                <View style={{ gap: 12 }}>
                  <ShimmerBlock height={220} borderRadius={22} />
                  <ShimmerBlock width="46%" height={12} borderRadius={6} />
                </View>
              ) : crowd.length > 0 ? (
                <>
                  {/* FeedCard carries its own 20pt gutters — unwind the page pad. */}
                  <View style={{ marginHorizontal: -tokens.density.pad }}>
                    {crowd.slice(0, CROWD_PREVIEW_COUNT).map((item, i) => (
                      <Animated.View
                        key={item.id}
                        entering={tearIn(Math.min(i, 8) * durations.stagger)}
                        style={styles.crowdCard}
                      >
                        <FeedCard item={item} currentUserId={user?.id} />
                      </Animated.View>
                    ))}
                  </View>
                  <View style={styles.seeAllRow}>
                    <PillButton
                      title={`See all ${Math.max(event.logCount, crowd.length)} →`}
                      variant="secondary"
                      springFeedback
                      haptic="light"
                      onPress={() =>
                        router.push({
                          pathname: '/event/crowd/[eventId]',
                          params: { eventId: id, eventName: event.name },
                        })
                      }
                    />
                  </View>
                </>
              ) : photosState.photos.length > 0 ? (
                // Crowd feed empty but photos exist — keep the flat grid.
                <PhotoGrid photos={photosState.photos} />
              ) : (
                <QuietEmpty
                  text={
                    past
                      ? 'No memories from the crowd yet.'
                      : 'Memories land here once the night happens.'
                  }
                />
              )}
            </View>

            {/* ── Seat views ── */}
            <View style={styles.section}>
              <SectionLabel>Seat views</SectionLabel>
              {seatStatus === 'loading' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ShimmerBlock height={120} borderRadius={tokens.radius.md} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ShimmerBlock height={120} borderRadius={tokens.radius.md} />
                  </View>
                </View>
              ) : seatSections.length > 0 ? (
                <SeatSectionTiles sections={seatSections} onPressSection={setOpenSection} />
              ) : (
                <QuietEmpty text="No seat views yet — add one when you log this show." />
              )}
            </View>

            {/* ── Setlist (crowd-sourced; only when entries exist; spoiler-shielded) ── */}
            {setlistEntries.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>Setlist</SectionLabel>
                <SetlistShield
                  entries={setlistEntries}
                  onVote={(entryId, vote) => void handleSetlistVote(entryId, vote)}
                />
              </View>
            ) : null}

            {/* ── Find tickets (future shows only) ── */}
            {/* Interim plain search link-outs until affiliate links land — */}
            {/* swap these URLs for the affiliate builders when available.  */}
            {!past ? (
              <View style={styles.section}>
                <SectionLabel>Find tickets</SectionLabel>
                <View style={styles.ticketPillRow}>
                  <PillButton
                    title="Ticketmaster"
                    variant="secondary"
                    springFeedback
                    haptic="light"
                    icon={
                      <Ionicons name="open-outline" size={13} color={tokens.colors.mute} />
                    }
                    onPress={() =>
                      void Linking.openURL(
                        `https://www.ticketmaster.com/search?q=${encodeURIComponent(
                          event.artist.name,
                        )}`,
                      )
                    }
                  />
                  <PillButton
                    title="StubHub"
                    variant="secondary"
                    springFeedback
                    haptic="light"
                    icon={
                      <Ionicons name="open-outline" size={13} color={tokens.colors.mute} />
                    }
                    onPress={() =>
                      void Linking.openURL(
                        `https://www.stubhub.com/secure/search?q=${encodeURIComponent(
                          `${event.artist.name} ${event.venue.city}`,
                        )}`,
                      )
                    }
                  />
                </View>
              </View>
            ) : null}

            {/* ── Presales (only when matched) ── */}
            {presales.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>Presales</SectionLabel>
                <PresaleCard presales={presales} />
              </View>
            ) : null}

            {/* ── Parties (host-run meetups) ── */}
            <View style={styles.section}>
              <SectionLabel>Parties</SectionLabel>
              {partiesStatus === 'loading' ? (
                <View style={{ gap: 10 }}>
                  <ShimmerBlock height={78} borderRadius={tokens.radius.lg} />
                  <ShimmerBlock width="46%" height={12} borderRadius={6} />
                </View>
              ) : parties.length > 0 ? (
                <View style={styles.partyList}>
                  {parties.map((party, i) => (
                    <Animated.View
                      key={party.id}
                      entering={tearIn(Math.min(i, 8) * durations.stagger)}
                    >
                      <PartyRow
                        party={party}
                        onPress={() =>
                          router.push({
                            pathname: '/party/[id]',
                            params: { id: party.id, eventName: event.name },
                          })
                        }
                      />
                    </Animated.View>
                  ))}
                </View>
              ) : (
                <SpringPressable
                  haptic="light"
                  onPress={() =>
                    router.push({
                      pathname: '/party/create',
                      params: { eventId: id, eventName: event.name, eventDate: event.date },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Host a party"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={styles.partyEmptyText}>
                    {partiesStatus === 'error'
                      ? "Couldn't load parties — host one anyway."
                      : 'No parties yet — host one.'}
                  </Text>
                </SpringPressable>
              )}
              <View style={styles.hostPillRow}>
                <PillButton
                  title="Host a party"
                  variant="ghost"
                  springFeedback
                  haptic="light"
                  onPress={() =>
                    router.push({
                      pathname: '/party/create',
                      params: { eventId: id, eventName: event.name, eventDate: event.date },
                    })
                  }
                />
              </View>
            </View>

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

      <SeatSectionSheet section={openSection} onClose={() => setOpenSection(null)} />
    </View>
  );
}
