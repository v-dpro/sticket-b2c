// PartyRow — one party in the event page's PARTIES section.
// Title 700 · host avatar + name mono · startsAt/location mono line ·
// going-count chip · yourStatus chip (GOING/HOST invert to ink,
// REQUESTED/INVITED outlined). Tap → /party/[id].

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Party, PartyMemberStatus } from '../../lib/api/parties';
import { monoDateTime } from '../entity/format';
import { useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { SpringPressable } from '../ui/SpringPressable';

// ── PartyStatusChip — your membership state, monochrome ────────────
// GOING / HOST invert to ink; REQUESTED / INVITED are outlined.

export function PartyStatusChip({ status }: { status: PartyMemberStatus }) {
  const styles = useThemedStyles((t) => ({
    chip: {
      borderRadius: t.radius.full,
      paddingHorizontal: 9,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    inverted: { backgroundColor: t.colors.inverseBg },
    outlined: {
      borderWidth: 1,
      borderColor: t.colors.line,
      backgroundColor: 'transparent',
    },
    text: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    textInverted: { color: t.colors.inverseFg },
    textOutlined: { color: t.colors.mute },
  }));

  const label =
    status === 'HOST'
      ? 'Hosting'
      : status === 'GOING'
        ? 'Going'
        : status === 'REQUESTED'
          ? 'Requested'
          : status === 'INVITED'
            ? 'Invited'
            : null;
  if (!label) return null; // DECLINED — no badge on the row

  const inverted = status === 'HOST' || status === 'GOING';
  return (
    <View style={[styles.chip, inverted ? styles.inverted : styles.outlined]}>
      <Text style={[styles.text, inverted ? styles.textInverted : styles.textOutlined]}>
        {label}
      </Text>
    </View>
  );
}

// ── PartyRow ───────────────────────────────────────────────────────

export function PartyRow({ party, onPress }: { party: Party; onPress: () => void }) {
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
    },
    body: { flex: 1, minWidth: 0, gap: 5 },
    title: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    hostName: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.mute,
    },
    metaLine: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.mute,
      textTransform: 'uppercase',
    },
    right: { alignItems: 'flex-end', gap: 6 },
    goingChip: {
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    goingText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.text,
    },
  }));

  const hostName = party.host.displayName ?? party.host.username;
  const metaBits: string[] = [];
  if (party.startsAt) metaBits.push(monoDateTime(party.startsAt));
  if (party.location) metaBits.push(party.location);
  if (party.visibility === 'INVITE') metaBits.push('INVITE ONLY');

  return (
    <SpringPressable
      haptic="light"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${party.title}, hosted by ${hostName}`}
      style={styles.row}
    >
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {party.title}
        </Text>
        <View style={styles.hostRow}>
          <Avatar uri={party.host.avatarUrl} name={hostName} size={16} />
          <Text style={styles.hostName} numberOfLines={1}>
            @{party.host.username}
          </Text>
        </View>
        {metaBits.length > 0 ? (
          <Text style={styles.metaLine} numberOfLines={1}>
            {metaBits.join(' · ')}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <View style={styles.goingChip}>
          <Text style={styles.goingText}>
            {party.counts.going} going
          </Text>
        </View>
        {party.yourStatus ? <PartyStatusChip status={party.yourStatus} /> : null}
      </View>
    </SpringPressable>
  );
}
