import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';

import type { Ticket } from '../../types/ticket';
import { TicketStatusBadge } from './TicketStatusBadge';
import { SpringPressable } from '../ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const eventDate = parseISO(ticket.event.date);
  const daysUntil = differenceInDays(eventDate, new Date());
  const isUpcoming = daysUntil >= 0;

  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    imageContainer: { position: 'relative' },
    image: { width: 60, height: 60, borderRadius: t.radius.md },
    imagePlaceholder: {
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    countdownBadge: {
      position: 'absolute',
      bottom: -4,
      left: -4,
      right: -4,
      backgroundColor: t.colors.inverseBg,
      borderRadius: t.radius.xs,
      paddingVertical: 2,
      alignItems: 'center',
    },
    countdownText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 8,
      fontWeight: '700',
      color: t.colors.inverseFg,
      letterSpacing: 0.5,
    },
    info: { flex: 1, marginLeft: 12, minWidth: 0 },
    artist: { fontSize: 16, fontWeight: '700', color: t.colors.fg },
    venue: { fontSize: 13, color: t.colors.mute, marginTop: 2 },
    date: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 12,
      color: t.colors.muteSoft,
      marginTop: 4,
    },
    seatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    seatText: { fontSize: 11, color: t.colors.muteSoft, flex: 1 },
    right: { alignItems: 'flex-end', gap: 8 },
  }));

  const handlePress = () => {
    router.push(`/wallet/${ticket.id}`);
  };

  return (
    <SpringPressable style={styles.container} onPress={handlePress} haptic="light" accessibilityRole="button">
      {/* Left: Artist Image */}
      <View style={styles.imageContainer}>
        {ticket.event.artist.imageUrl ? (
          <Image source={{ uri: ticket.event.artist.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={24} color={tokens.colors.mute} />
          </View>
        )}

        {/* Days countdown badge */}
        {isUpcoming && daysUntil <= 7 && (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>
              {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? '1 DAY' : `${daysUntil} DAYS`}
            </Text>
          </View>
        )}
      </View>

      {/* Middle: Event Info */}
      <View style={styles.info}>
        <Text style={styles.artist} numberOfLines={1}>
          {ticket.event.artist.name}
        </Text>
        <Text style={styles.venue} numberOfLines={1}>
          {ticket.event.venue.name}
        </Text>
        <Text style={styles.date}>{format(eventDate, 'EEE, MMM d • h:mm a')}</Text>

        {/* Seat Info */}
        <View style={styles.seatRow}>
          <Ionicons name="location" size={12} color={tokens.colors.muteSoft} />
          <Text style={styles.seatText} numberOfLines={1}>
            {ticket.isGeneralAdmission
              ? 'General Admission'
              : `Sec ${ticket.section}${ticket.row ? ` • Row ${ticket.row}` : ''}${ticket.seat ? ` • Seat ${ticket.seat}` : ''}`}
          </Text>
        </View>
      </View>

      {/* Right: Status & Arrow */}
      <View style={styles.right}>
        {ticket.status !== 'KEEPING' && <TicketStatusBadge status={ticket.status} />}
        <Ionicons name="chevron-forward" size={20} color={tokens.colors.muteSoft} />
      </View>
    </SpringPressable>
  );
}
