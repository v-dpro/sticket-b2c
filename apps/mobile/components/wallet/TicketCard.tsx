import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';

import type { Ticket } from '../../types/ticket';
import { TicketStatusBadge } from './TicketStatusBadge';

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const router = useRouter();
  const eventDate = parseISO(ticket.event.date);
  const daysUntil = differenceInDays(eventDate, new Date());
  const isUpcoming = daysUntil >= 0;

  const handlePress = () => {
    router.push(`/wallet/${ticket.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* Left: Artist Image */}
      <View style={styles.imageContainer}>
        {ticket.event.artist.imageUrl ? (
          <Image source={{ uri: ticket.event.artist.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={24} color="#8B5CF6" />
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
          <Ionicons name="location" size={12} color="#6B6B8D" />
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
        <Ionicons name="chevron-forward" size={20} color="#6B6B8D" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#0A0B1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  artist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  venue: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 4,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  seatText: {
    fontSize: 11,
    color: '#6B6B8D',
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
});



