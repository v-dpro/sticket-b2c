// FindTicketsSheet — the full ticket-source list. Primary sellers first
// (Ticketmaster, AXS), then resale (StubHub, SeatGeek, Vivid Seats, TickPick,
// Gametime). Each row routes through buildTicketLink so it's affiliate-wrapped
// when an ID is configured. Renders in the shared BottomSheet; ink-only.

import React, { useMemo } from 'react';
import { Linking, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  TICKET_PLATFORMS,
  buildTicketLink,
  hasAffiliateConfigured,
} from '../../lib/tickets/affiliate';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BottomSheet } from '../ui/BottomSheet';
import { SpringPressable } from '../ui/SpringPressable';

type FindTicketsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** "artist + city" search query. */
  query: string;
  /** A specific event URL from the API, preferred over search when present. */
  directUrl?: string | null;
};

export function FindTicketsSheet({ visible, onClose, query, directUrl }: FindTicketsSheetProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const showDisclosure = useMemo(() => hasAffiliateConfigured(), []);

  const open = (platformId: string) => {
    const url = buildTicketLink(platformId, { query, directUrl });
    if (url) void Linking.openURL(url).catch(() => {});
    onClose();
  };

  const primary = TICKET_PLATFORMS.filter((p) => p.tier === 'primary');
  const resale = TICKET_PLATFORMS.filter((p) => p.tier === 'resale');

  const Row = ({ id, name }: { id: string; name: string }) => (
    <SpringPressable
      haptic="light"
      onPress={() => open(id)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Find tickets on ${name}`}
    >
      <Text style={styles.rowName}>{name}</Text>
      <Ionicons name="open-outline" size={16} color={tokens.colors.mute} />
    </SpringPressable>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Find tickets">
      <View style={styles.header}>
        <Text style={styles.title}>FIND TICKETS</Text>
      </View>

      <Text style={styles.group}>OFFICIAL</Text>
      {primary.map((p) => (
        <Row key={p.id} id={p.id} name={p.name} />
      ))}

      <Text style={styles.group}>RESALE</Text>
      {resale.map((p) => (
        <Row key={p.id} id={p.id} name={p.name} />
      ))}

      {showDisclosure ? (
        <Text style={styles.disclosure}>
          Some links are affiliate links — Sticket may earn a commission at no extra cost to you.
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  ({
    header: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    title: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 12.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: tokens.colors.fg,
    },
    group: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.4,
      textTransform: 'uppercase' as const,
      color: tokens.colors.muteSoft,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 4,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    rowName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: tokens.colors.fg,
    },
    disclosure: {
      fontSize: 11.5,
      lineHeight: 16,
      color: tokens.colors.muteSoft,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
  });
