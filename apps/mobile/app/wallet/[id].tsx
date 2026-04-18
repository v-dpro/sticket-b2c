import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import { BarcodeDisplay } from '../../components/wallet/BarcodeDisplay';
import { TicketActions } from '../../components/wallet/TicketActions';
import { TicketStatusBadge } from '../../components/wallet/TicketStatusBadge';
import { useTicketDetail } from '../../hooks/useTicketDetail';
import { deleteTicket } from '../../lib/api/tickets';
import { ensureTicketRemindersScheduled } from '../../lib/notifications/ticketReminders';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { colors } from '../../lib/theme';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ticket, loading, error } = useTicketDetail(id || '');
  const [deleting, setDeleting] = useState(false);
  const goBack = useSafeBack();

  useEffect(() => {
    if (ticket) {
      void ensureTicketRemindersScheduled(ticket);
    }
  }, [ticket]);

  const handleBack = goBack;

  const handleViewEvent = () => {
    if (ticket) {
      router.push(`/event/${ticket.event.id}`);
    }
  };

  const handleSell = () => {
    Alert.alert(
      'Sell Ticket',
      "This feature is coming soon! You'll be able to list your ticket for sale.",
      [{ text: 'OK' }]
    );
  };

  const handleDelete = async () => {
    if (!ticket) return;

    setDeleting(true);
    try {
      await deleteTicket(ticket.id);
      goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete ticket.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brandPurple} />
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load ticket</Text>
        <Pressable onPress={handleBack}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const eventDate = parseISO(ticket.event.date);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Ticket</Text>
        <TicketStatusBadge status={ticket.status} size="medium" />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <Pressable style={styles.eventCard} onPress={handleViewEvent}>
          <Text style={styles.artistName}>{ticket.event.artist.name}</Text>
          <Text style={styles.venueName}>{ticket.event.venue.name}</Text>
          <Text style={styles.venueCity}>
            {ticket.event.venue.city}
            {ticket.event.venue.state ? `, ${ticket.event.venue.state}` : ''}
          </Text>
          <Text style={styles.eventDate}>{format(eventDate, 'EEEE, MMMM d, yyyy')}</Text>
          <Text style={styles.eventTime}>{format(eventDate, 'h:mm a')}</Text>
        </Pressable>

        {/* Seat Info */}
        <View style={styles.seatCard}>
          <Text style={styles.seatLabel}>Your Seat</Text>
          {ticket.isGeneralAdmission ? (
            <Text style={styles.seatGA}>General Admission</Text>
          ) : (
            <View style={styles.seatGrid}>
              {ticket.section && (
                <View style={styles.seatItem}>
                  <Text style={styles.seatItemLabel}>Section</Text>
                  <Text style={styles.seatItemValue}>{ticket.section}</Text>
                </View>
              )}
              {ticket.row && (
                <View style={styles.seatItem}>
                  <Text style={styles.seatItemLabel}>Row</Text>
                  <Text style={styles.seatItemValue}>{ticket.row}</Text>
                </View>
              )}
              {ticket.seat && (
                <View style={styles.seatItem}>
                  <Text style={styles.seatItemLabel}>Seat</Text>
                  <Text style={styles.seatItemValue}>{ticket.seat}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Barcode */}
        {ticket.barcode && (
          <View style={styles.barcodeSection}>
            <Text style={styles.barcodeLabel}>Scan at venue</Text>
            <BarcodeDisplay barcode={ticket.barcode} format={ticket.barcodeFormat} barcodeImageUrl={ticket.barcodeImageUrl} />
          </View>
        )}

        {/* Actions */}
        <TicketActions ticket={ticket} onSell={handleSell} onDelete={handleDelete} />

        {/* Ticket Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Details</Text>

          {ticket.confirmationNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confirmation #</Text>
              <Text style={styles.detailValue}>{ticket.confirmationNumber}</Text>
            </View>
          )}

          {ticket.purchasePrice != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Purchase Price</Text>
              <Text style={styles.detailValue}>${ticket.purchasePrice.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Added</Text>
            <Text style={styles.detailValue}>{format(parseISO(ticket.createdAt), 'MMM d, yyyy')}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Source</Text>
            <Text style={styles.detailValue}>
              {ticket.source === 'EMAIL'
                ? 'Email Import'
                : ticket.source === 'SCAN'
                  ? 'Barcode Scan'
                  : ticket.source === 'TRANSFER'
                    ? 'Transfer'
                    : 'Manual Entry'}
            </Text>
          </View>

          {ticket.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesText}>{ticket.notes}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {deleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: colors.brandPurple,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  artistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  venueName: {
    fontSize: 16,
    color: colors.brandCyan,
    marginTop: 8,
    textAlign: 'center',
  },
  venueCity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 12,
  },
  eventTime: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 2,
  },
  seatCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  seatLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  seatGA: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seatGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  seatItem: {
    alignItems: 'center',
  },
  seatItemLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  seatItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  barcodeSection: {
    marginTop: 16,
  },
  barcodeLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  notesContainer: {
    marginTop: 12,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});



