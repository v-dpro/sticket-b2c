// GuestListSheet — the party's full guest list in a bottom sheet, grouped
// by membership status: HOSTS (original host + co-hosts), GOING, then for
// hosts/co-hosts only REQUESTED (with inline approve/decline) and INVITED.
// Tapping a person closes the sheet and pushes their profile. The original
// host can promote GOING members to co-host from here.
//
// Renders in the shared BottomSheet shell (swipe-down / backdrop to
// dismiss). Fully tokenized.

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { PartyDetail, PartyMember } from '../../lib/api/parties';
import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

interface GuestListSheetProps {
  visible: boolean;
  onClose: () => void;
  party: PartyDetail;
  /** Viewer can manage (HOST or COHOST) — reveals requested/invited groups. */
  canManage: boolean;
  /** Viewer is the original host — reveals "Make co-host" on GOING rows. */
  isOriginalHost: boolean;
  /** Approve/decline a pending request (POST /parties/:id/respond). */
  onRespond: (userId: string, accept: boolean) => void;
  /** Promote a GOING member to co-host (POST /parties/:id/cohosts). */
  onPromote: (userId: string) => void;
  /** User id with an in-flight respond/promote action, if any. */
  busyUserId: string | null;
}

export function GuestListSheet({
  visible,
  onClose,
  party,
  canManage,
  isOriginalHost,
  onRespond,
  onPromote,
  busyUserId,
}: GuestListSheetProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);

  // The creator's HOST row leads; co-hosts follow in promotion order.
  const hosts = party.members.filter((m) => m.status === 'HOST' || m.status === 'COHOST');
  const going = party.members.filter((m) => m.status === 'GOING');
  const requested = canManage ? party.members.filter((m) => m.status === 'REQUESTED') : [];
  const invited = canManage ? party.members.filter((m) => m.status === 'INVITED') : [];

  const openProfile = (userId: string) => {
    haptics.light();
    onClose();
    router.push({ pathname: '/profile/[id]', params: { id: userId } });
  };

  const renderPerson = (m: PartyMember, trailing?: React.ReactNode) => (
    <View key={m.user.id} style={styles.row}>
      <SpringPressable
        haptic="none"
        onPress={() => openProfile(m.user.id)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${m.user.displayName ?? m.user.username}'s profile`}
        style={styles.person}
      >
        <Avatar uri={m.user.avatarUrl} name={m.user.displayName ?? m.user.username} size={36} />
        <View style={styles.personBody}>
          <Text style={styles.personName} numberOfLines={1}>
            {m.user.displayName ?? m.user.username}
          </Text>
          <Text style={styles.personUsername} numberOfLines={1}>
            @{m.user.username}
            {m.status === 'HOST' ? ' · HOST' : m.status === 'COHOST' ? ' · CO-HOST' : ''}
          </Text>
        </View>
      </SpringPressable>
      {busyUserId === m.user.id ? (
        <ActivityIndicator size="small" color={tokens.colors.mute} />
      ) : (
        trailing
      )}
    </View>
  );

  const section = (label: string, count: number) => (
    <Text style={styles.sectionLabel}>{`${label} · ${count}`}</Text>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.78} accessibilityLabel="Guest list">
      <Text style={styles.title}>Guest list</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {section(hosts.length > 1 ? 'Hosts' : 'Host', hosts.length)}
        {hosts.map((m) => renderPerson(m))}

        {going.length > 0 ? (
          <>
            {section('Going', going.length)}
            {going.map((m) =>
              renderPerson(
                m,
                isOriginalHost ? (
                  <PillButton
                    title="Co-host"
                    variant="secondary"
                    size="sm"
                    springFeedback
                    haptic="medium"
                    onPress={() => onPromote(m.user.id)}
                  />
                ) : undefined,
              ),
            )}
          </>
        ) : null}

        {requested.length > 0 ? (
          <>
            {section('Requested', requested.length)}
            {requested.map((m) =>
              renderPerson(
                m,
                <View style={styles.actions}>
                  <PillButton
                    title="Approve"
                    variant="primary"
                    size="sm"
                    springFeedback
                    haptic="medium"
                    onPress={() => onRespond(m.user.id, true)}
                  />
                  <PillButton
                    title="Decline"
                    variant="ghost"
                    size="sm"
                    springFeedback
                    haptic="light"
                    onPress={() => onRespond(m.user.id, false)}
                  />
                </View>,
              ),
            )}
          </>
        ) : null}

        {invited.length > 0 ? (
          <>
            {section('Invited', invited.length)}
            {invited.map((m) => renderPerson(m))}
          </>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: tokens.colors.fg,
      paddingHorizontal: 20,
    },
    listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
    sectionLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
      marginTop: 18,
      marginBottom: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    person: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    personBody: { flex: 1, minWidth: 0 },
    personName: { fontSize: 14, fontWeight: '600', color: tokens.colors.fg },
    personUsername: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.4,
      color: tokens.colors.mute,
      marginTop: 1,
    },
    actions: { flexDirection: 'row', gap: 8 },
  });
