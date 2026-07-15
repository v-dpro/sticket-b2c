// app/night/[eventId].tsx — THE NIGHT: the per-show planning canvas. One
// page per upcoming show that aggregates everything you need before doors:
// countdown hero → YOUR TICKET (seat + remind-me, or presale/find-tickets
// when unticketed) → GET IN (directions + top venue tips) → YOUR VIEW (seat
// views for your section) → THE PEOPLE (friends going, parties, the hang
// thread). After the date passes it flips into a "log this show" prompt.
//
// Pure composition — no new endpoints. APIs: GET /events/:id ·
// GET /users/:id/timeline (upcoming → your ticket/party) ·
// GET /venues/:id/tips · GET /venues/:id/seat-views ·
// GET /events/:id/parties · GET /events/:id/hang ·
// GET/POST/DELETE /users/me/reminders · GET /presales?artistId=.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { useSession } from '../../hooks/useSession';
import { getErrorMessage } from '../../lib/api/errorUtils';
import {
  getArtistPresales,
  getEvent,
  getHang,
  type EventPresale,
} from '../../lib/api/events';
import { getEventParties, type Party } from '../../lib/api/parties';
import { addReminder, getMyReminders, removeReminder } from '../../lib/api/reminders';
import { getUserTimeline, type TimelineUpcomingItem } from '../../lib/api/timeline';
import { getSeatViews, getVenueTips } from '../../lib/api/venues';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { EventDetails } from '../../types/event';
import type { SeatView, VenueTip } from '../../types/venue';

import { DegreeFacepile, type FacePerson } from '../../components/ui/DegreeFacepile';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { StubPerforation } from '../../components/ui/Stub';

// ── Time helpers (mirrors YourShowsSection) ─────────────────────

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.ceil((target - startOfToday()) / 86400000);
}

function countdownLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return 'PAST';
  if (days === 0) return 'TONIGHT';
  if (days === 1) return 'TOMORROW';
  if (days < 60) return `IN ${days} DAYS`;
  return `IN ${Math.round(days / 30)} MONTHS`;
}

function formatShowDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
}

function formatPresaleStart(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .toUpperCase();
}

// Entry/parking intel gets people through the door — those categories lead;
// ties break on upvotes.
const TIP_PRIORITY: Record<string, number> = { entry: 0, parking: 1, seating: 2, food: 3, general: 4 };

function rankTips(tips: VenueTip[]): VenueTip[] {
  return [...tips]
    .sort(
      (a, b) =>
        (TIP_PRIORITY[a.category] ?? 9) - (TIP_PRIORITY[b.category] ?? 9) ||
        b.upvotes - a.upvotes,
    )
    .slice(0, 3);
}

function mapsUrl(venue: EventDetails['venue']): string {
  if (venue.lat != null && venue.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
  }
  const q = encodeURIComponent(`${venue.name} ${venue.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Presale rows for THIS event: same calendar day + same venue name. */
function matchPresales(presales: EventPresale[], event: EventDetails): EventPresale[] {
  const day = event.date.slice(0, 10);
  const venue = event.venue.name.toLowerCase();
  return presales.filter(
    (p) => p.eventDate?.slice(0, 10) === day && p.venueName?.toLowerCase() === venue,
  );
}

type HangPreview = { messageCount: number; lastText: string | null; lastUser: string | null };

export default function NightScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useSession();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [plan, setPlan] = useState<TimelineUpcomingItem | null>(null);
  const [tips, setTips] = useState<VenueTip[]>([]);
  const [seatViews, setSeatViews] = useState<SeatView[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [hang, setHang] = useState<HangPreview | null>(null);
  const [presales, setPresales] = useState<EventPresale[]>([]);
  const [reminded, setReminded] = useState(false);
  const [remindBusy, setRemindBusy] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return false;
    let detail: EventDetails;
    try {
      detail = await getEvent(eventId);
      setEvent(detail);
    } catch (e) {
      setErrorMsg(getErrorMessage(e));
      return false;
    }

    // Everything else is best-effort — a missing section never blocks the page.
    const [planRes, tipsRes, partiesRes, hangRes, remindersRes, presalesRes] =
      await Promise.allSettled([
        user?.id ? getUserTimeline(user.id, { limit: 1 }) : Promise.resolve(null),
        getVenueTips(detail.venue.id),
        getEventParties(eventId, { limit: 5 }),
        getHang(eventId),
        getMyReminders(),
        getArtistPresales(detail.artist.id),
      ]);

    let myPlan: TimelineUpcomingItem | null = null;
    if (planRes.status === 'fulfilled' && planRes.value) {
      myPlan =
        (planRes.value.upcoming ?? []).find(
          (u) => u.event.id === eventId && (u.type === 'ticket' || u.type === 'interested'),
        ) ?? null;
      setPlan(myPlan);
    }
    if (tipsRes.status === 'fulfilled') setTips(rankTips(tipsRes.value ?? []));
    if (partiesRes.status === 'fulfilled') setParties(partiesRes.value?.parties ?? []);
    if (hangRes.status === 'fulfilled' && hangRes.value) {
      const msgs = hangRes.value.messages ?? [];
      const last = msgs[0] ?? null;
      setHang({
        messageCount: msgs.length,
        lastText: last?.text ?? null,
        lastUser: last?.user?.displayName ?? last?.user?.username ?? null,
      });
    }
    if (remindersRes.status === 'fulfilled') {
      setReminded(new Set(remindersRes.value).has(eventId));
    }
    if (presalesRes.status === 'fulfilled') {
      setPresales(matchPresales(presalesRes.value ?? [], detail));
    }

    // Seat views want the ticket's section (falls back to the whole venue).
    try {
      const views = await getSeatViews(detail.venue.id, {
        section: myPlan?.section || undefined,
        limit: 8,
      });
      setSeatViews(
        views.length > 0 || !myPlan?.section
          ? views
          : await getSeatViews(detail.venue.id, { limit: 8 }),
      );
    } catch {
      // seat views stay empty
    }
    return true;
  }, [eventId, user?.id]);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    void load().then((ok) => {
      if (alive) setStatus(ok ? 'ready' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const ok = await load();
    if (ok) setStatus('ready');
    setRefreshing(false);
  }, [load]);

  const toggleRemind = useCallback(async () => {
    if (!eventId) return;
    const next = !reminded;
    setReminded(next);
    setRemindBusy(true);
    try {
      if (next) await addReminder(eventId);
      else await removeReminder(eventId);
      haptics.success();
    } catch {
      haptics.error();
      setReminded(!next);
    } finally {
      setRemindBusy(false);
    }
  }, [eventId, reminded]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: t.density.pad,
      paddingTop: 6,
      paddingBottom: 4,
    },
    backBtn: { padding: 4, marginLeft: -4 },
    headerLabel: {
      flex: 1,
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      color: t.colors.muteSoft,
    },
    countChip: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.inverseBg,
    },
    countChipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.5,
      color: t.colors.inverseFg,
    },
    scrollContent: { paddingBottom: 120 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Hero — the night in one glance; taps through to the event page.
    hero: { paddingHorizontal: t.density.pad, paddingTop: 10, paddingBottom: 4, gap: 6 },
    heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: t.colors.fg },
    heroMeta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    heroLink: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    sectionLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 22,
      marginBottom: 10,
    },
    // Plans are dashed (C3) — the night hasn't happened yet.
    card: {
      marginHorizontal: t.density.pad,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    solidCard: {
      marginHorizontal: t.density.pad,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    cardPad: { paddingHorizontal: 14, paddingVertical: 12 },
    seatGrid: { flexDirection: 'row', gap: 18, paddingHorizontal: 14, paddingVertical: 12 },
    seatCell: { gap: 3, minWidth: 54 },
    seatKey: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    seatVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    remindRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    remindLabel: {
      flex: 1,
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    rowText: { fontSize: 14.5, lineHeight: 20, color: t.colors.fg },
    rowSub: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 4,
    },
    divider: { height: 1, backgroundColor: t.colors.hairline, marginHorizontal: 14 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    linkOut: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      color: t.colors.mute,
      paddingHorizontal: t.density.pad,
      marginTop: 8,
    },
    viewsRail: { paddingHorizontal: t.density.pad, gap: 10, flexDirection: 'row' },
    viewTile: { width: 116, gap: 5 },
    viewImg: { width: 116, height: 150, borderRadius: t.radius.sm, backgroundColor: t.colors.card2 },
    viewCap: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    peopleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    peopleText: { flex: 1, fontSize: 14.5, color: t.colors.fg },
    emptyNote: {
      fontSize: 13.5,
      color: t.colors.mute,
      paddingHorizontal: t.density.pad,
      lineHeight: 19,
    },
    ctaWrap: { paddingHorizontal: 14, paddingVertical: 12 },
    tonightBanner: {
      marginHorizontal: t.density.pad,
      marginTop: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.inverseBg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
    },
    tonightText: { fontSize: 15, fontWeight: '700', color: t.colors.inverseFg },
  }));

  // ── Derived ───────────────────────────────────────────────────

  const days = event ? daysUntil(event.date) : 0;
  const isPast = days < 0;
  const isTonight = days === 0;
  const ticketed = plan?.type === 'ticket';
  const hasSeat = Boolean(plan?.section || plan?.row || plan?.seat);
  const livePresale = useMemo(() => {
    const now = Date.now();
    return presales.find((p) => {
      const start = new Date(p.presaleStart).getTime();
      const end = p.presaleEnd ? new Date(p.presaleEnd).getTime() : start + 86400000 * 2;
      return now <= end;
    });
  }, [presales]);

  const going: FacePerson[] = useMemo(
    () =>
      (event?.friendsInterested ?? [])
        .concat(event?.friendsWhoWent ?? [])
        .map((f) => ({ id: f.id, username: f.username, displayName: f.displayName, avatarUrl: f.avatarUrl, degree: f.degree })),
    [event],
  );

  let stagger = 0;
  const enter = () => tearIn(Math.min(stagger++, 8) * durations.stagger);

  // ── Render ────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.mute} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error' || !event) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this night"
            message={errorMsg ?? undefined}
            onRetry={() => {
              setStatus('loading');
              void load().then((ok) => setStatus(ok ? 'ready' : 'error'));
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable
          haptic="light"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.headerLabel}>THE NIGHT</Text>
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{countdownLabel(event.date)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
      >
        {/* Hero */}
        <Animated.View entering={enter()}>
          <SpringPressable
            haptic="light"
            onPress={() => router.push(`/event/${event.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${event.name} — open event page`}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>{event.name}</Text>
            <Text style={styles.heroMeta}>
              {event.venue.name}
              {event.venue.city ? ` · ${event.venue.city}` : ''} · {formatShowDate(event.date)}
            </Text>
            <Text style={styles.heroLink}>EVENT PAGE →</Text>
          </SpringPressable>
        </Animated.View>

        {/* Tonight banner → show mode / log */}
        {(isTonight || isPast) && (
          <Animated.View entering={enter()} style={styles.tonightBanner}>
            <Text style={styles.tonightText}>
              {isPast ? 'How was it? Log the night while it’s fresh.' : 'It’s show day.'}
            </Text>
            <PillButton
              title={isPast ? 'Log this show' : 'Log it after — set up now'}
              variant="secondary"
              size="sm"
              springFeedback
              haptic="medium"
              onPress={() => router.push('/log/search')}
            />
          </Animated.View>
        )}

        {/* YOUR TICKET */}
        <Animated.View entering={enter()}>
          <Text style={styles.sectionLabel}>Your ticket</Text>
          {ticketed ? (
            <View style={styles.card}>
              {hasSeat ? (
                <View style={styles.seatGrid}>
                  <View style={styles.seatCell}>
                    <Text style={styles.seatKey}>SEC</Text>
                    <Text style={styles.seatVal}>{plan?.section || '—'}</Text>
                  </View>
                  <View style={styles.seatCell}>
                    <Text style={styles.seatKey}>ROW</Text>
                    <Text style={styles.seatVal}>{plan?.row || '—'}</Text>
                  </View>
                  <View style={styles.seatCell}>
                    <Text style={styles.seatKey}>SEAT</Text>
                    <Text style={styles.seatVal}>{plan?.seat || '—'}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.cardPad}>
                  <Text style={styles.rowText}>Ticketed — no seat on file.</Text>
                  <Text style={styles.rowSub}>ADD YOUR SECTION FROM THE WALLET</Text>
                </View>
              )}
              <StubPerforation />
              <View style={styles.remindRow}>
                <Text style={styles.remindLabel}>Remind me on show day</Text>
                <Switch
                  value={reminded}
                  onValueChange={() => void toggleRemind()}
                  disabled={remindBusy}
                  trackColor={{ false: tokens.colors.card2, true: tokens.colors.success }}
                  thumbColor={tokens.colors.white}
                  ios_backgroundColor={tokens.colors.card2}
                  accessibilityLabel="Remind me on show day"
                />
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardPad}>
                {livePresale ? (
                  <>
                    <Text style={styles.rowText}>
                      {livePresale.presaleType} presale · starts{' '}
                      {formatPresaleStart(livePresale.presaleStart)}
                    </Text>
                    {livePresale.signupUrl ? (
                      <Text style={styles.rowSub}>SIGNUP REQUIRED — TAP FIND TICKETS</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.rowText}>
                    {plan?.type === 'interested'
                      ? 'You’re circling this one — no ticket yet.'
                      : 'No ticket on file for this night.'}
                  </Text>
                )}
              </View>
              <View style={styles.ctaWrap}>
                <PillButton
                  title="Find tickets"
                  variant="primary"
                  size="sm"
                  springFeedback
                  haptic="medium"
                  onPress={() => {
                    const url =
                      livePresale?.signupUrl || livePresale?.ticketUrl || event.ticketUrl;
                    if (url) void Linking.openURL(url);
                    else router.push(`/event/${event.id}`);
                  }}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* GET IN */}
        <Animated.View entering={enter()}>
          <Text style={styles.sectionLabel}>Get in</Text>
          <View style={styles.solidCard}>
            <SpringPressable
              haptic="light"
              onPress={() => void Linking.openURL(mapsUrl(event.venue))}
              accessibilityRole="button"
              accessibilityLabel={`Directions to ${event.venue.name}`}
              style={[styles.cardPad, styles.inlineRow]}
            >
              <Ionicons name="navigate-outline" size={18} color={tokens.colors.fg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{event.venue.name}</Text>
                <Text style={styles.rowSub}>
                  {event.venue.city}
                  {event.venue.state ? `, ${event.venue.state}` : ''} · DIRECTIONS →
                </Text>
              </View>
            </SpringPressable>
            {tips.map((tip) => (
              <View key={tip.id}>
                <View style={styles.divider} />
                <View style={styles.cardPad}>
                  <Text style={styles.rowText}>{tip.text}</Text>
                  <Text style={styles.rowSub}>
                    {tip.category.toUpperCase()} · @{tip.user.username.toUpperCase()} ·{' '}
                    {tip.upvotes} FOUND THIS USEFUL
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <SpringPressable
            haptic="light"
            onPress={() => router.push(`/venue/${event.venue.id}`)}
            accessibilityRole="button"
            accessibilityLabel="All venue intel"
          >
            <Text style={styles.linkOut}>
              {tips.length === 0 ? 'NO TIPS YET — KNOW THIS VENUE? ADD ONE →' : 'ALL VENUE INTEL →'}
            </Text>
          </SpringPressable>
        </Animated.View>

        {/* YOUR VIEW */}
        {seatViews.length > 0 && (
          <Animated.View entering={enter()}>
            <Text style={styles.sectionLabel}>
              {plan?.section && seatViews.some((v) => v.section === plan.section)
                ? `Your view · section ${plan.section}`
                : 'Views from the room'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.viewsRail}>
                {seatViews.map((v) => (
                  <SpringPressable
                    key={v.id}
                    haptic="light"
                    onPress={() => router.push(`/venue/${event.venue.id}`)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`Seat view from section ${v.section}`}
                    style={styles.viewTile}
                  >
                    <Image
                      source={{ uri: v.thumbnailUrl || v.photoUrl }}
                      style={styles.viewImg}
                      contentFit="cover"
                      transition={80}
                      cachePolicy="memory-disk"
                    />
                    <Text style={styles.viewCap} numberOfLines={1}>
                      SEC {v.section}
                      {v.row ? ` · ROW ${v.row}` : ''}
                    </Text>
                  </SpringPressable>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* THE PEOPLE */}
        <Animated.View entering={enter()}>
          <Text style={styles.sectionLabel}>The people</Text>
          {going.length > 0 ? (
            <View style={styles.solidCard}>
              <View style={styles.peopleRow}>
                <DegreeFacepile people={going} totalCount={going.length} />
                <Text style={styles.peopleText}>
                  {going.length === 1
                    ? '1 friend is on this night'
                    : `${going.length} friends are on this night`}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyNote}>
              No friends on this one yet — start the thread or host a party and rally them.
            </Text>
          )}

          {parties.map((p) => (
            <SpringPressable
              key={p.id}
              haptic="light"
              onPress={() => router.push(`/party/${p.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Party: ${p.title}`}
              style={[styles.solidCard, { marginTop: 10 }]}
            >
              <View style={styles.peopleRow}>
                <Ionicons name="sparkles-outline" size={18} color={tokens.colors.fg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{p.title}</Text>
                  <Text style={styles.rowSub}>
                    {p.counts.going} GOING · HOSTED BY @{p.host.username.toUpperCase()}
                    {p.yourStatus ? ` · ${p.yourStatus}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={tokens.colors.mute} />
              </View>
            </SpringPressable>
          ))}

          <SpringPressable
            haptic="light"
            onPress={() => router.push(`/hang/${event.id}`)}
            accessibilityRole="button"
            accessibilityLabel="Open the hang thread"
            style={[styles.solidCard, { marginTop: 10 }]}
          >
            <View style={styles.peopleRow}>
              <Ionicons name="chatbubbles-outline" size={18} color={tokens.colors.fg} />
              <View style={{ flex: 1 }}>
                {hang && hang.messageCount > 0 ? (
                  <>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {hang.lastUser ? `${hang.lastUser}: ` : ''}
                      {hang.lastText ?? ''}
                    </Text>
                    <Text style={styles.rowSub}>THE HANG · {hang.messageCount}+ MESSAGES</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.rowText}>Start the hang</Text>
                    <Text style={styles.rowSub}>ONE THREAD FOR EVERYONE ON THIS NIGHT</Text>
                  </>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.mute} />
            </View>
          </SpringPressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
