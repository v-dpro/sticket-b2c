import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import { BarcodeDisplay } from '../../components/wallet/BarcodeDisplay';
import { TicketActions } from '../../components/wallet/TicketActions';
import { TicketStatusBadge } from '../../components/wallet/TicketStatusBadge';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTicketDetail } from '../../hooks/useTicketDetail';
import { deleteTicket } from '../../lib/api/tickets';
import { ensureTicketRemindersScheduled } from '../../lib/notifications/ticketReminders';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ticket, loading, error } = useTicketDetail(id || '');
  const [deleting, setDeleting] = useState(false);
  const goBack = useSafeBack();

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    center: { flex: 1, backgroundColor: t.colors.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    errorText: { fontSize: 16, color: t.colors.error },
    backLink: { fontSize: 16, color: t.colors.accent, fontWeight: '600' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: 12,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: t.colors.fg },
    scrollView: { flex: 1 },
    eventCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: 20,
      marginHorizontal: t.density.pad,
      marginTop: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    artistName: { fontSize: 24, fontWeight: '800', color: t.colors.fg, textAlign: 'center', letterSpacing: -0.4 },
    venueName: { fontSize: 16, color: t.colors.textSoft, marginTop: 8, textAlign: 'center', fontWeight: '600' },
    venueCity: { fontSize: 14, color: t.colors.mute, marginTop: 2 },
    eventDate: { fontFamily: t.fontFamilies.mono, fontSize: 13, color: t.colors.fg, marginTop: 12 },
    eventTime: { fontFamily: t.fontFamilies.mono, fontSize: 13, color: t.colors.mute, marginTop: 2 },
    seatCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: 20,
      marginHorizontal: t.density.pad,
      marginTop: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    seatLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      color: t.colors.mute,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    seatGA: { fontSize: 20, fontWeight: '700', color: t.colors.fg },
    seatGrid: { flexDirection: 'row', gap: 24 },
    seatItem: { alignItems: 'center' },
    seatItemLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      color: t.colors.mute,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    seatItemValue: { fontFamily: t.fontFamilies.monoBold, fontSize: 22, fontWeight: '700', color: t.colors.fg },
    barcodeSection: { marginTop: 16 },
    barcodeLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      color: t.colors.mute,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      textAlign: 'center',
      marginBottom: 12,
    },
    detailsCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: 20,
      marginHorizontal: t.density.pad,
      marginTop: 16,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    detailsTitle: { fontSize: 16, fontWeight: '700', color: t.colors.fg, marginBottom: 16 },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    detailLabel: { fontSize: 14, color: t.colors.mute },
    detailValue: { fontSize: 14, color: t.colors.fg, fontWeight: '500' },
    notesContainer: { marginTop: 12 },
    notesText: { fontSize: 14, color: t.colors.textSoft, marginTop: 4, lineHeight: 20 },
    deletingOverlay: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }));

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={tokens.colors.mute} />
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load ticket</Text>
        <SpringPressable onPress={handleBack} haptic="light">
          <Text style={styles.backLink}>Go back</Text>
        </SpringPressable>
      </View>
    );
  }

  const eventDate = parseISO(ticket.event.date);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <SpringPressable onPress={handleBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.headerTitle}>Ticket</Text>
        <TicketStatusBadge status={ticket.status} size="medium" />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <SpringPressable style={styles.eventCard} onPress={handleViewEvent} haptic="light" accessibilityRole="button">
          <Text style={styles.artistName}>{ticket.event.artist.name}</Text>
          <Text style={styles.venueName}>{ticket.event.venue.name}</Text>
          <Text style={styles.venueCity}>
            {ticket.event.venue.city}
            {ticket.event.venue.state ? `, ${ticket.event.venue.state}` : ''}
          </Text>
          <Text style={styles.eventDate}>{format(eventDate, 'EEEE, MMMM d, yyyy')}</Text>
          <Text style={styles.eventTime}>{format(eventDate, 'h:mm a')}</Text>
        </SpringPressable>

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
          <ActivityIndicator size="large" color={tokens.colors.white} />
        </View>
      )}
    </SafeAreaView>
  );
}
