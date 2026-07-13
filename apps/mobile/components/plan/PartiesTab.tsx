// Plan · PARTIES — the Partiful lane: parties you're hosting or co-hosting
// (with join requests to approve inline), going to, and invited to. Party
// rows are STUBS (C3 — an invite is a ticket); cancelled ones strike
// through. Hosting starts here ("Host a party" → pick an upcoming show)
// or from any event page.

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import {
  getMyParties,
  respondToRequest,
  type MyParties,
  type PartyLite,
} from '../../lib/api/parties';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { EventPickerSheet } from '../party/EventPickerSheet';
import { ErrorState } from '../ui/ErrorState';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { StubPerforation } from '../ui/Stub';

function partyWhen(p: PartyLite): string {
  const iso = p.startsAt ?? p.event.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = p.startsAt
    ? ` · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '';
  return `${day}${time}`.toUpperCase();
}

export function PartiesTab() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [data, setData] = useState<MyParties | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getMyParties());
      setStatus('ready');
    } catch (e) {
      setErrorMsg(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  // Refresh on focus so a party created via the picker shows on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const styles = useThemedStyles((t) => ({
    center: { paddingVertical: 60, alignItems: 'center' },
    section: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 18,
      marginBottom: 10,
    },
    // A party invite is a ticket — the row is a stub.
    stub: {
      marginHorizontal: t.density.pad,
      marginBottom: 12,
      borderRadius: t.radius.stub,
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    stubBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 3 },
    // Cancelled parties stay listed, struck through (dimmed stub border).
    stubCancelled: { borderColor: t.colors.line },
    title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, color: t.colors.fg },
    titleCancelled: { textDecorationLine: 'line-through', color: t.colors.mute },
    // "Host a party" entry — dashed (the party doesn't exist yet).
    hostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginHorizontal: t.density.pad,
      marginTop: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      borderRadius: t.radius.card,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    hostRowText: { fontSize: 14, fontWeight: '600', color: t.colors.text },
    hostRowCue: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    when: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    eventLine: { fontSize: 13, color: t.colors.mute },
    stubFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    footMono: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    statusChip: {
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: t.radius.chip,
      backgroundColor: t.colors.inverseBg,
    },
    statusChipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.8,
      color: t.colors.inverseFg,
    },
    requestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.card2 },
    reqBody: { flex: 1, minWidth: 0, gap: 2 },
    reqName: { fontSize: 14.5, fontWeight: '700', color: t.colors.fg },
    reqMeta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    reqActions: { flexDirection: 'row', gap: 8 },
    empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    emptySub: { fontSize: 13.5, color: t.colors.mute, textAlign: 'center', lineHeight: 19 },
  }));

  const respond = useCallback(
    async (partyId: string, userId: string, action: 'approve' | 'decline') => {
      setActing(`${partyId}:${userId}`);
      try {
        await respondToRequest(partyId, userId, action === 'approve');
        haptics.success();
        await load();
      } catch {
        haptics.error();
      } finally {
        setActing(null);
      }
    },
    [load],
  );

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.colors.mute} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ paddingVertical: 40, paddingHorizontal: 20 }}>
        <ErrorState title="Couldn't load your parties" message={errorMsg ?? undefined} onRetry={() => void load()} />
      </View>
    );
  }

  const empty =
    !data ||
    (data.hosting.length === 0 &&
      data.going.length === 0 &&
      data.invited.length === 0 &&
      data.requests.length === 0);

  let i = 0;
  const renderParty = (party: PartyLite, statusChip?: string) => {
    const idx = i++;
    const cancelled = party.status === 'CANCELLED';
    return (
      <Animated.View key={party.id} entering={tearIn(Math.min(idx, 8) * durations.stagger)}>
        <SpringPressable
          haptic="light"
          onPress={() => router.push(`/party/${party.id}`)}
          accessibilityRole="button"
          accessibilityLabel={
            cancelled ? `${party.title}, cancelled` : `${party.title}, ${partyWhen(party)}`
          }
          style={[styles.stub, cancelled && styles.stubCancelled]}
        >
          <View style={styles.stubBody}>
            <Text style={[styles.title, cancelled && styles.titleCancelled]} numberOfLines={1}>
              {party.title}
            </Text>
            <Text style={styles.when}>{cancelled ? 'CANCELLED' : partyWhen(party)}</Text>
            <Text style={styles.eventLine} numberOfLines={1}>
              {party.event.artist?.name ?? party.event.name}
              {party.event.venue?.name ? ` · ${party.event.venue.name}` : ''}
            </Text>
          </View>
          <StubPerforation notchColor={tokens.colors.bg} dashColor={tokens.colors.dash} />
          <View style={styles.stubFooter}>
            <Text style={styles.footMono}>
              {party.goingCount} GOING · @{party.host.username}
            </Text>
            {statusChip ? (
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{statusChip}</Text>
              </View>
            ) : null}
          </View>
        </SpringPressable>
      </Animated.View>
    );
  };

  return (
    <View>
      {empty ? (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={36} color={tokens.colors.muteSoft} />
          <Text style={styles.emptyTitle}>No parties yet</Text>
          <Text style={styles.emptySub}>
            Host a pregame or an afterparty for one of your shows — friends can request to join, or find it on Explore if it&apos;s public.
          </Text>
          <PillButton
            title="Host a party"
            variant="primary"
            springFeedback
            haptic="medium"
            onPress={() => setPickerOpen(true)}
          />
          <PillButton title="Find a show" variant="ghost" springFeedback haptic="light" onPress={() => router.push('/(tabs)/explore')} />
        </View>
      ) : (
        <SpringPressable
          haptic="light"
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Host a party"
          style={styles.hostRow}
        >
          <Text style={styles.hostRowText}>Host a party</Text>
          <Text style={styles.hostRowCue}>Pick a show →</Text>
        </SpringPressable>
      )}

      {data && data.requests.length > 0 ? (
        <View>
          <Text style={styles.section}>Requests to join</Text>
          {data.requests.map((req) => {
            const key = `${req.party.id}:${req.requester.id}`;
            const busy = acting === key;
            return (
              <View key={key} style={styles.requestRow}>
                {req.requester.avatarUrl ? (
                  <Image source={{ uri: req.requester.avatarUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontWeight: '700', color: tokens.colors.mute }}>
                      {(req.requester.displayName ?? req.requester.username).slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.reqBody}>
                  <Text style={styles.reqName} numberOfLines={1}>
                    {req.requester.displayName ?? `@${req.requester.username}`}
                  </Text>
                  <Text style={styles.reqMeta} numberOfLines={1}>
                    WANTS IN · {req.party.title}
                  </Text>
                </View>
                <View style={styles.reqActions}>
                  <PillButton
                    title={busy ? '…' : 'Approve'}
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onPress={() => void respond(req.party.id, req.requester.id, 'approve')}
                    springFeedback
                    haptic="none"
                  />
                  <PillButton
                    title="Decline"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onPress={() => void respond(req.party.id, req.requester.id, 'decline')}
                    springFeedback
                    haptic="none"
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {data && data.hosting.length > 0 ? (
        <View>
          <Text style={styles.section}>Hosting</Text>
          {data.hosting.map((p) => renderParty(p, p.myStatus === 'COHOST' ? 'CO-HOST' : 'HOST'))}
        </View>
      ) : null}
      {data && data.invited.length > 0 ? (
        <View>
          <Text style={styles.section}>Invited</Text>
          {data.invited.map((p) => renderParty(p, 'INVITED'))}
        </View>
      ) : null}
      {data && data.going.length > 0 ? (
        <View>
          <Text style={styles.section}>Going</Text>
          {data.going.map((p) => renderParty(p))}
        </View>
      ) : null}

      <EventPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(event) => {
          setPickerOpen(false);
          router.push({
            pathname: '/party/create',
            params: { eventId: event.id, eventName: event.name, eventDate: event.date },
          });
        }}
      />
    </View>
  );
}
