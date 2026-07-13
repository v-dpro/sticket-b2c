// Party page — a host-run pre/post-show meetup attached to an event.
// Eyebrow PARTY → event link → title → hosts row (facepile when co-hosted)
// → when/where mono block → status CTA (state matrix below) → host tools
// (requests / invite / edit / share) → announcements → chat → guest list.
//
// Status matrix (myRole):
//   null + PUBLIC  → primary "Request to join"        (POST /join → REQUESTED)
//   REQUESTED      → disabled "Requested" + mute line
//   INVITED        → primary "Accept invite"          (POST /join → GOING)
//   GOING          → inverted "You're going" chip. NOTE: there is no
//                    leave-party endpoint yet, so "Can't make it" is
//                    intentionally omitted.
//   DECLINED       → PUBLIC: request again · INVITE: quiet mute line
//   COHOST         → "You're co-hosting" chip + every host tool except cancel
//   HOST           → "You're hosting" chip + host tools + cancel party.
//
// Cancelled parties (status CANCELLED) stay readable to members: struck-
// through title + CANCELLED eyebrow, all actions folded away.
//
// APIs: GET /parties/:id · POST /parties/:id/join · /respond · /invite ·
// /cohosts · /cancel · PATCH /parties/:id · /announcements
// (lib/api/parties.ts).

import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Facepile, QuietEmpty, SectionLabel } from '../../components/entity/EntityBits';
import { EntityNav } from '../../components/entity/EntityChrome';
import { EntityError, EntityPageSkeleton } from '../../components/entity/EntityStates';
import { monoDateTime } from '../../components/entity/format';
import { GuestListSheet } from '../../components/party/GuestListSheet';
import { InviteFriendsSheet } from '../../components/party/InviteFriendsSheet';
import { Avatar } from '../../components/ui/Avatar';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

import { getEvent } from '../../lib/api/events';
import {
  cancelParty,
  getParty,
  getPartyMessages,
  inviteToParty,
  joinParty,
  postPartyAnnouncement,
  postPartyMessage,
  promoteCohost,
  respondToRequest,
  type PartyDetail,
  type PartyMessage,
} from '../../lib/api/parties';
import { MessageRow } from '../../components/threads/MessageRow';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { createPartyLink } from '../../lib/share/deepLinks';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { StubPerforation } from '../../components/ui/Stub';

export default function PartyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{ id: string; eventName?: string }>();
  const id = params.id ? String(params.id) : '';

  const [party, setParty] = useState<PartyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Event name for the link line — the param covers navigation from the
  // event page; deep entries fall back to a best-effort event fetch.
  const [eventName, setEventName] = useState(params.eventName ? String(params.eventName) : '');

  const [joinBusy, setJoinBusy] = useState(false);
  const [respondBusyId, setRespondBusyId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // ── Group chat (members only — GET/POST 403 for outsiders) ────────
  const [chatMessages, setChatMessages] = useState<PartyMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<'loading' | 'ready' | 'forbidden' | 'error'>(
    'loading',
  );
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await getParty(id);
      setParty(detail);
      setError(null);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 403
          ? 'This party is invite-only.'
          : status === 404
            ? 'This party no longer exists.'
            : "Couldn't load this party.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Last ~50, oldest → newest (bottom-anchored chat read). A 403 means
  // the viewer isn't on the list — the chat body explains, composer hides.
  const loadChat = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getPartyMessages(id);
      const messages = Array.isArray(res?.messages) ? res.messages : [];
      setChatMessages(
        [...messages]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .slice(-50),
      );
      setChatStatus('ready');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setChatStatus(status === 403 ? 'forbidden' : 'error');
    }
  }, [id]);

  // Poll-refresh on focus (no websockets v1) — also covers the first load,
  // and picks up edits saved in the /party/edit modal on the way back.
  useFocusEffect(
    useCallback(() => {
      void load();
      void loadChat();
    }, [load, loadChat]),
  );

  // Best-effort event name for the link line.
  useEffect(() => {
    if (eventName || !party?.eventId) return;
    let alive = true;
    void getEvent(party.eventId)
      .then((ev) => {
        if (alive && ev?.name) setEventName(ev.name);
      })
      .catch(() => {
        // quiet — the line falls back to "View event"
      });
    return () => {
      alive = false;
    };
  }, [eventName, party?.eventId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadChat()]);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────

  // Request to join (PUBLIC) or accept an invite — the server returns the
  // resulting status; a refetch reconciles counts/members.
  const handleJoin = async () => {
    if (!party || joinBusy) return;
    setJoinBusy(true);
    try {
      const res = await joinParty(party.id);
      haptics.success();
      setParty((prev) => (prev ? { ...prev, yourStatus: res.status } : prev));
      void load();
    } catch {
      haptics.error();
    } finally {
      setJoinBusy(false);
    }
  };

  const handleRespond = async (userId: string, accept: boolean) => {
    if (!party || respondBusyId) return;
    setRespondBusyId(userId);
    try {
      const res = await respondToRequest(party.id, userId, accept);
      haptics.medium();
      setParty((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.user.id === userId ? { ...m, status: res.status } : m,
          ),
          counts: {
            ...prev.counts,
            requested: Math.max(0, prev.counts.requested - 1),
            going: accept ? prev.counts.going + 1 : prev.counts.going,
          },
        };
      });
    } catch {
      haptics.error();
    } finally {
      setRespondBusyId(null);
    }
  };

  const handleInvite = async (userIds: string[]) => {
    if (!party) return;
    await inviteToParty(party.id, userIds);
    void load();
  };

  // Original host only — promote a GOING member to co-host.
  const handlePromote = async (userId: string) => {
    if (!party || respondBusyId) return;
    setRespondBusyId(userId);
    try {
      await promoteCohost(party.id, userId);
      haptics.success();
      await load();
    } catch {
      haptics.error();
    } finally {
      setRespondBusyId(null);
    }
  };

  const handleShare = async () => {
    if (!party) return;
    const url = createPartyLink(party.id);
    try {
      await Share.share({
        title: party.title,
        message: `${party.title}${eventName ? ` — ${eventName}` : ''} — ${url}`,
        url,
      });
    } catch {
      // sheet dismissed
    }
  };

  const handlePostAnnouncement = async () => {
    const text = announcementText.trim();
    if (!party || !text || postingAnnouncement) return;
    setPostingAnnouncement(true);
    try {
      const created = await postPartyAnnouncement(party.id, text);
      haptics.success();
      setAnnouncementText('');
      setParty((prev) =>
        prev ? { ...prev, announcements: [created, ...prev.announcements] } : prev,
      );
    } catch {
      haptics.error();
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatText.trim();
    if (!party || !text || sendingChat) return;
    setSendingChat(true);
    try {
      const created = await postPartyMessage(party.id, text);
      haptics.success();
      setChatText('');
      setChatMessages((prev) => [...prev, created].slice(-50));
    } catch (err) {
      haptics.error();
      // Membership changed under us — fold the composer away.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) setChatStatus('forbidden');
    } finally {
      setSendingChat(false);
    }
  };

  // Soft cancel — the party stays readable (struck through) for members;
  // everyone going/invited gets a party_cancelled notification.
  const handleCancelParty = () => {
    if (!party) return;
    Alert.alert('Cancel this party?', 'Everyone on the list is told it’s off — this can’t be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel party',
        style: 'destructive',
        onPress: () => {
          void cancelParty(party.id)
            .then(() => {
              haptics.medium();
              setParty((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
              void load();
            })
            .catch(() => haptics.error());
        },
      },
    ]);
  };

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    content: { paddingHorizontal: t.density.pad },
    // The party header is a STUB — an invite is a ticket (C3). Notches
    // punch through to the page bg on the perforation line.
    // Invite stub — fg border + notches (C3/§4 Party: an invite is a ticket).
    stubCard: {
      marginTop: 14,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.stub,
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      overflow: 'hidden',
      ...t.shadows.card,
    },
    // Cancelled parties drop back to a dim hairline — no longer a live invite.
    stubCardCancelled: { borderWidth: 1, borderColor: t.colors.line },
    stubBody: { paddingHorizontal: t.density.cardPad, paddingTop: t.density.cardPad, paddingBottom: 14 },
    stubFooter: { paddingHorizontal: t.density.cardPad, paddingVertical: 12 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    title: {
      fontSize: 21,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 6,
      lineHeight: 26,
    },
    // Cancelled = struck through, dimmed — the party stays readable.
    titleCancelled: { textDecorationLine: 'line-through', color: t.colors.mute },
    eventLink: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 8,
    },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hostName: { fontSize: 14, fontWeight: '600', color: t.colors.text },
    hostUsername: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.mute,
      marginTop: 1,
    },
    metaBlock: { marginTop: 14, gap: 5 },
    metaLine: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    description: { fontSize: 14.5, fontWeight: '400', color: t.colors.textSoft, lineHeight: 21, marginTop: 14 },
    ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' },
    // Edit / Share host tools sit beside the status chip.
    manageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
    statusChip: {
      borderRadius: t.radius.full,
      backgroundColor: t.colors.inverseBg,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    statusChipText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.inverseFg,
    },
    // Host-only invite affordance — dashed (planned) border, mono cue.
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      borderRadius: t.radius.card,
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
    },
    inviteText: { fontSize: 14, fontWeight: '600', color: t.colors.text },
    inviteCue: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    muteLine: { fontSize: 12.5, color: t.colors.mute, marginTop: 10, lineHeight: 18 },
    section: { marginTop: 28 },
    requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    requestBody: { flex: 1, minWidth: 0 },
    requestName: { fontSize: 14, fontWeight: '600', color: t.colors.fg },
    requestUsername: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.4,
      color: t.colors.mute,
      marginTop: 1,
    },
    composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    // Chat composer sits BELOW its messages (announcements' sits above).
    chatComposer: { marginBottom: 0, marginTop: 10 },
    composerInput: {
      flex: 1,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: t.colors.fg,
    },
    // Announcement CARDS (§4 Party) — bordered card tone, not bare rows.
    announcement: {
      padding: 14,
      gap: 6,
      marginBottom: 10,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    announcementMeta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    announcementText: { fontSize: 14.5, fontWeight: '400', color: t.colors.text, lineHeight: 21 },
    membersRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    membersCount: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    cancelRow: { marginTop: 32, alignItems: 'flex-start' },
  }));

  if (loading && !party) {
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

  if (error || !party) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <EntityError
          title="Couldn't open this party"
          message={error}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
          onBack={goBack}
        />
      </View>
    );
  }

  const status = party.myRole ?? party.yourStatus;
  const isOriginalHost = status === 'HOST';
  // Host powers (requests / invite / edit / announce) — cancel stays with
  // the original host.
  const canManage = status === 'HOST' || status === 'COHOST';
  const cancelled = party.status === 'CANCELLED';
  const hosts = party.hosts && party.hosts.length > 0 ? party.hosts : [party.host];
  const hostName = hosts.map((h) => h.displayName ?? h.username).join(' + ');
  const pendingRequests = canManage ? party.members.filter((m) => m.status === 'REQUESTED') : [];
  const goingMembers = party.members.filter(
    (m) => m.status === 'HOST' || m.status === 'COHOST' || m.status === 'GOING',
  );

  // ── Status CTA (see matrix in the header comment) ─────────────────
  let cta: React.ReactNode = null;
  if (cancelled) {
    // No actions on a cancelled party — the header state says it all.
    cta = null;
  } else if (isOriginalHost) {
    cta = (
      <View style={styles.statusChip}>
        <Text style={styles.statusChipText}>You're hosting</Text>
      </View>
    );
  } else if (status === 'COHOST') {
    cta = (
      <View style={styles.statusChip}>
        <Text style={styles.statusChipText}>You're co-hosting</Text>
      </View>
    );
  } else if (status === 'GOING') {
    // No leave-party endpoint exists yet — "Can't make it" is omitted on
    // purpose rather than faked client-side.
    cta = (
      <View style={styles.statusChip}>
        <Text style={styles.statusChipText}>You're going</Text>
      </View>
    );
  } else if (status === 'REQUESTED') {
    cta = (
      <PillButton
        title="Requested"
        variant="secondary"
        springFeedback
        haptic="light"
        disabled
        onPress={() => {}}
      />
    );
  } else if (status === 'INVITED') {
    cta = (
      <PillButton
        title={joinBusy ? 'Accepting…' : 'Accept invite'}
        variant="primary"
        springFeedback
        haptic="medium"
        disabled={joinBusy}
        onPress={() => void handleJoin()}
      />
    );
  } else if (party.visibility === 'PUBLIC') {
    // Non-member (or previously declined) on a public party.
    cta = (
      <PillButton
        title={joinBusy ? 'Requesting…' : 'Request to join'}
        variant="primary"
        springFeedback
        haptic="medium"
        disabled={joinBusy}
        onPress={() => void handleJoin()}
      />
    );
  }

  const ctaNote = cancelled
    ? 'The hosts called this one off.'
    : canManage
      ? null
      : status === 'REQUESTED'
        ? 'Waiting on the host — you’ll be in once they approve.'
        : status === 'INVITED'
          ? `${hostName} invited you.`
          : status === 'DECLINED' && party.visibility === 'INVITE'
            ? 'You’re not on the list for this one.'
            : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
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
            {/* ── Header — the party card is a STUB (an invite is a ticket) ── */}
            <View style={[styles.stubCard, cancelled && styles.stubCardCancelled]}>
              <View style={styles.stubBody}>
                <Text style={styles.eyebrow}>{cancelled ? 'Pre-party · Cancelled' : 'Pre-party'}</Text>
                <Text style={[styles.title, cancelled && styles.titleCancelled]}>
                  {party.title}
                </Text>
                <SpringPressable
                  haptic="light"
                  onPress={() =>
                    router.push({
                      pathname: '/event/[eventId]',
                      params: { eventId: party.eventId },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={eventName ? `Go to ${eventName}` : 'Go to the event'}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={styles.eventLink} numberOfLines={1}>
                    {eventName ? `For ${eventName} →` : 'View event →'}
                  </Text>
                </SpringPressable>

                {/* ── When / where ── */}
                {party.startsAt || party.location || party.visibility === 'INVITE' ? (
                  <View style={styles.metaBlock}>
                    {party.startsAt ? (
                      <Text style={styles.metaLine}>{monoDateTime(party.startsAt)}</Text>
                    ) : null}
                    {party.location ? (
                      <Text style={styles.metaLine} numberOfLines={2}>
                        {party.location}
                      </Text>
                    ) : null}
                    {party.visibility === 'INVITE' ? (
                      <Text style={styles.metaLine}>Invite only</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <StubPerforation notchColor={tokens.colors.bg} />

              {/* ── Hosts row — facepile when co-hosted ("Hosted by A + B") ── */}
              <View style={styles.stubFooter}>
                <View style={styles.hostRow}>
                  {hosts.length > 1 ? (
                    <Facepile
                      people={hosts.map((h) => ({
                        id: h.id,
                        username: h.username,
                        avatarUrl: h.avatarUrl,
                      }))}
                      size={32}
                    />
                  ) : (
                    <Avatar uri={party.host.avatarUrl} name={hostName} size={32} />
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.hostName} numberOfLines={1}>
                      Hosted by {hostName}
                    </Text>
                    <Text style={styles.hostUsername} numberOfLines={1}>
                      {hosts.map((h) => `@${h.username}`).join(' + ')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {party.description ? (
              <Text style={styles.description}>{party.description}</Text>
            ) : null}

            {/* ── Status CTA ── */}
            {cta ? <View style={styles.ctaRow}>{cta}</View> : null}
            {ctaNote ? <Text style={styles.muteLine}>{ctaNote}</Text> : null}

            {/* ── Everyone: share the party. Hosts: edit. ── */}
            {!cancelled ? (
              <View style={styles.manageRow}>
                {canManage ? (
                  <PillButton
                    title="Edit"
                    variant="secondary"
                    size="sm"
                    springFeedback
                    haptic="light"
                    onPress={() =>
                      router.push({ pathname: '/party/edit', params: { id: party.id } })
                    }
                  />
                ) : null}
                <PillButton
                  title="Share"
                  variant="secondary"
                  size="sm"
                  springFeedback
                  haptic="light"
                  onPress={() => void handleShare()}
                />
              </View>
            ) : null}

            {/* ── Hosts: invite friends (dashed = not-yet-there people) ── */}
            {canManage && !cancelled ? (
              <SpringPressable
                haptic="light"
                onPress={() => setInviteOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Invite friends"
                style={styles.inviteRow}
              >
                <Text style={styles.inviteText}>Invite friends</Text>
                <Text style={styles.inviteCue}>Invite →</Text>
              </SpringPressable>
            ) : null}

            {/* ── Hosts: pending requests ── */}
            {canManage && !cancelled && pendingRequests.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>{`Requests · ${pendingRequests.length}`}</SectionLabel>
                {pendingRequests.map((m, i) => (
                  <Animated.View
                    key={m.user.id}
                    entering={tearIn(Math.min(i, 8) * durations.stagger)}
                    style={styles.requestRow}
                  >
                    <Avatar
                      uri={m.user.avatarUrl}
                      name={m.user.displayName ?? m.user.username}
                      size={36}
                    />
                    <View style={styles.requestBody}>
                      <Text style={styles.requestName} numberOfLines={1}>
                        {m.user.displayName ?? m.user.username}
                      </Text>
                      <Text style={styles.requestUsername} numberOfLines={1}>
                        @{m.user.username}
                      </Text>
                    </View>
                    {respondBusyId === m.user.id ? (
                      <ActivityIndicator size="small" color={tokens.colors.mute} />
                    ) : (
                      <>
                        <PillButton
                          title="Approve"
                          variant="primary"
                          size="sm"
                          springFeedback
                          haptic="medium"
                          onPress={() => void handleRespond(m.user.id, true)}
                        />
                        <PillButton
                          title="Decline"
                          variant="ghost"
                          size="sm"
                          springFeedback
                          haptic="light"
                          onPress={() => void handleRespond(m.user.id, false)}
                        />
                      </>
                    )}
                  </Animated.View>
                ))}
              </View>
            ) : null}

            {/* ── Announcements (hosts compose; everyone reads) ── */}
            {(canManage && !cancelled) || party.announcements.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>Announcements</SectionLabel>
                {canManage && !cancelled ? (
                  <View style={styles.composerRow}>
                    <TextInput
                      style={styles.composerInput}
                      placeholder="Tell everyone the plan…"
                      placeholderTextColor={tokens.colors.muteSoft}
                      value={announcementText}
                      onChangeText={setAnnouncementText}
                      maxLength={500}
                      multiline
                    />
                    <PillButton
                      title="Post"
                      variant="primary"
                      size="sm"
                      springFeedback
                      haptic="medium"
                      disabled={!announcementText.trim() || postingAnnouncement}
                      onPress={() => void handlePostAnnouncement()}
                    />
                  </View>
                ) : null}
                {party.announcements.length > 0 ? (
                  party.announcements.map((a, i) => (
                    <Animated.View
                      key={a.id}
                      entering={tearIn(Math.min(i, 8) * durations.stagger)}
                      style={styles.announcement}
                    >
                      <Text style={styles.announcementText}>{a.text}</Text>
                      <Text style={styles.announcementMeta}>
                        @{a.author.username} · {monoDateTime(a.createdAt)}
                      </Text>
                    </Animated.View>
                  ))
                ) : (
                  <QuietEmpty text="Nothing announced yet." />
                )}
              </View>
            ) : null}

            {/* ── Chat — the party's group thread. GET/POST are members-only
                   (403 for outsiders): they get the one-liner, no composer.
                   Refetches on focus (poll, no websockets v1). ── */}
            <View style={styles.section}>
              <SectionLabel>Chat</SectionLabel>
              {chatStatus === 'loading' ? (
                <ActivityIndicator size="small" color={tokens.colors.mute} />
              ) : chatStatus === 'forbidden' ? (
                <QuietEmpty text="Chat opens up once you're on the list." />
              ) : chatStatus === 'error' ? (
                <QuietEmpty text="Couldn't load the chat right now." />
              ) : chatMessages.length === 0 ? (
                <QuietEmpty text="No messages yet — say hi." />
              ) : (
                chatMessages.map((m, i) => (
                  <MessageRow
                    key={m.id}
                    author={m.author}
                    text={m.text}
                    createdAt={m.createdAt}
                    index={i}
                  />
                ))
              )}
              {chatStatus === 'ready' &&
              !cancelled &&
              (status === 'HOST' || status === 'COHOST' || status === 'GOING') ? (
                <View style={[styles.composerRow, styles.chatComposer]}>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Message the party…"
                    placeholderTextColor={tokens.colors.muteSoft}
                    value={chatText}
                    onChangeText={setChatText}
                    maxLength={500}
                    multiline
                  />
                  <PillButton
                    title="Send"
                    variant="primary"
                    size="sm"
                    springFeedback
                    haptic="medium"
                    disabled={!chatText.trim() || sendingChat}
                    onPress={() => void handleSendChat()}
                  />
                </View>
              ) : null}
            </View>

            {/* ── Guest list (tap → full grouped list in a sheet) ── */}
            <View style={styles.section}>
              <SectionLabel>Guest list</SectionLabel>
              <SpringPressable
                haptic="light"
                onPress={() => setGuestsOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open the guest list"
              >
                <Animated.View entering={FadeInDown.duration(240)} style={styles.membersRow}>
                  {goingMembers.length > 0 ? (
                    <Facepile
                      people={goingMembers.map((m) => ({
                        id: m.user.id,
                        username: m.user.username,
                        avatarUrl: m.user.avatarUrl,
                      }))}
                    />
                  ) : null}
                  <Text style={styles.membersCount}>
                    {party.counts.going} going
                    {party.counts.requested > 0 && canManage
                      ? ` · ${party.counts.requested} requested`
                      : ''}
                    {party.counts.invited > 0 && canManage
                      ? ` · ${party.counts.invited} invited`
                      : ''}
                    {'  →'}
                  </Text>
                </Animated.View>
              </SpringPressable>
            </View>

            {/* ── Original host only: cancel (soft — members keep the page) ── */}
            {isOriginalHost && !cancelled ? (
              <View style={styles.cancelRow}>
                <PillButton
                  title="Cancel this party"
                  variant="ghost"
                  size="sm"
                  springFeedback
                  haptic="light"
                  onPress={handleCancelParty}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <InviteFriendsSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        excludeIds={party.members.map((m) => m.user.id)}
      />

      <GuestListSheet
        visible={guestsOpen}
        onClose={() => setGuestsOpen(false)}
        party={party}
        canManage={canManage && !cancelled}
        isOriginalHost={isOriginalHost && !cancelled}
        onRespond={(userId, accept) => void handleRespond(userId, accept)}
        onPromote={(userId) => void handlePromote(userId)}
        busyUserId={respondBusyId}
      />
    </View>
  );
}
