import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useAddTicket } from '../../hooks/useAddTicket';
import type { BarcodeFormat } from '../../types/ticket';
import { ensureTicketRemindersScheduled } from '../../lib/notifications/ticketReminders';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export default function AddTicketScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{ barcode?: string; barcodeFormat?: BarcodeFormat }>();
  const { loading, searchResults, searching, searchEvents, submitTicket, clearSearch } = useAddTicket();

  // Event selection
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventSearch, setEventSearch] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Manual event fields
  const [artistName, setArtistName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Ticket details
  const [isGA, setIsGA] = useState(false);
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [seat, setSeat] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('UNKNOWN');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: 12,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.3 },
    scrollView: { flex: 1, paddingHorizontal: t.density.pad },
    section: { marginTop: 24 },
    sectionTitle: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      color: t.colors.mute,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    input: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: t.colors.fg,
      fontSize: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    selectedEvent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      padding: 16,
      borderWidth: 1,
      borderColor: t.colors.fg, // selected state reads via ink-weight border (C1)
    },
    selectedEventInfo: { flex: 1 },
    selectedArtist: { fontSize: 16, fontWeight: '700', color: t.colors.fg },
    selectedVenue: { fontSize: 14, color: t.colors.mute, marginTop: 2 },
    selectedDate: { fontFamily: t.fontFamilies.mono, fontSize: 12, color: t.colors.muteSoft, marginTop: 2 },
    searchingIndicator: { marginVertical: 12 },
    searchResults: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    searchResult: { padding: 16, borderBottomWidth: 1, borderBottomColor: t.colors.hairline },
    resultArtist: { fontSize: 15, fontWeight: '600', color: t.colors.fg },
    resultDetails: { fontSize: 13, color: t.colors.mute, marginTop: 2 },
    manualLink: { fontSize: 14, color: t.colors.fg, textAlign: 'center', fontWeight: '600' },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    dateButtonText: { fontSize: 16, color: t.colors.fg },
    searchInstead: { fontSize: 14, color: t.colors.fg, textAlign: 'center', fontWeight: '600' },
    gaToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    gaLabel: { fontSize: 16, color: t.colors.fg, fontWeight: '500' },
    seatInputs: { flexDirection: 'row', gap: 12 },
    seatInput: { flex: 1 },
    hint: { fontSize: 12, color: t.colors.muteSoft, marginTop: -4 },
    notesInput: { height: 80, textAlignVertical: 'top' },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: 34,
      backgroundColor: t.colors.bg,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.inverseBg,
      gap: 8,
    },
    submitText: { fontSize: 16, fontWeight: '600', color: t.colors.inverseFg },
  }));

  const scanned = useMemo(() => {
    const b = typeof params.barcode === 'string' ? params.barcode : '';
    const f = (typeof params.barcodeFormat === 'string' ? params.barcodeFormat : 'UNKNOWN') as BarcodeFormat;
    return { b, f };
  }, [params.barcode, params.barcodeFormat]);

  useEffect(() => {
    if (scanned.b) {
      setBarcode(scanned.b);
      setBarcodeFormat(scanned.f || 'UNKNOWN');
      // Clear params so going back doesn’t keep re-applying.
      router.setParams({ barcode: undefined, barcodeFormat: undefined } as any);
    }
  }, [router, scanned.b, scanned.f]);

  const handleEventSearch = (text: string) => {
    setEventSearch(text);
    if (text.length >= 2) {
      void searchEvents(text);
    } else {
      clearSearch();
    }
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setEventSearch('');
    clearSearch();
  };

  const handleSubmit = async () => {
    if (!selectedEvent && !showManualEntry) {
      Alert.alert('Missing Event', 'Please select or enter an event.');
      return;
    }

    if (showManualEntry && (!artistName || !venueName)) {
      Alert.alert('Missing Info', 'Please enter artist and venue names.');
      return;
    }

    const data = {
      eventId: selectedEvent?.id,
      artistName: showManualEntry ? artistName : undefined,
      venueName: showManualEntry ? venueName : undefined,
      eventDate: showManualEntry ? eventDate.toISOString() : undefined,
      isGeneralAdmission: isGA,
      section: isGA ? undefined : section,
      row: isGA ? undefined : row,
      seat: isGA ? undefined : seat,
      barcode: barcode || undefined,
      barcodeFormat: barcode ? barcodeFormat : undefined,
      confirmationNumber: confirmationNumber || undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      notes: notes || undefined,
    };

    const ticket = await submitTicket(data);
    if (ticket) {
      void ensureTicketRemindersScheduled(ticket);
      router.replace(`/wallet/${ticket.id}`);
    } else {
      Alert.alert('Error', 'Failed to add ticket. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="close" size={24} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Add Ticket</Text>
        <SpringPressable onPress={() => router.push('/wallet/scan-ticket')} haptic="light" accessibilityRole="button">
          <Ionicons name="scan" size={24} color={tokens.colors.fg} />
        </SpringPressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Event Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event</Text>

          {selectedEvent ? (
            <View style={styles.selectedEvent}>
              <View style={styles.selectedEventInfo}>
                <Text style={styles.selectedArtist}>{selectedEvent.artist.name}</Text>
                <Text style={styles.selectedVenue}>{selectedEvent.venue.name}</Text>
                <Text style={styles.selectedDate}>{new Date(selectedEvent.date).toLocaleDateString()}</Text>
              </View>
              <SpringPressable onPress={() => setSelectedEvent(null)} haptic="light" accessibilityRole="button">
                <Ionicons name="close-circle" size={24} color={tokens.colors.muteSoft} />
              </SpringPressable>
            </View>
          ) : showManualEntry ? (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Artist name"
                placeholderTextColor={tokens.colors.muteSoft}
                value={artistName}
                onChangeText={setArtistName}
              />
              <TextInput
                style={styles.input}
                placeholder="Venue name"
                placeholderTextColor={tokens.colors.muteSoft}
                value={venueName}
                onChangeText={setVenueName}
              />
              <SpringPressable style={styles.dateButton} onPress={() => setShowDatePicker(true)} haptic="light" accessibilityRole="button">
                <Text style={styles.dateButtonText}>{eventDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar" size={20} color={tokens.colors.mute} />
              </SpringPressable>
              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setEventDate(date);
                  }}
                />
              )}
              <SpringPressable onPress={() => setShowManualEntry(false)} haptic="light" accessibilityRole="button">
                <Text style={styles.searchInstead}>Search for event instead</Text>
              </SpringPressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search for event..."
                placeholderTextColor={tokens.colors.muteSoft}
                value={eventSearch}
                onChangeText={handleEventSearch}
              />
              {searching && <ActivityIndicator style={styles.searchingIndicator} color={tokens.colors.mute} />}
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((event) => (
                    <SpringPressable key={event.id} style={styles.searchResult} onPress={() => handleSelectEvent(event)} haptic="light" accessibilityRole="button">
                      <Text style={styles.resultArtist}>{event.artist.name}</Text>
                      <Text style={styles.resultDetails}>
                        {event.venue.name} • {new Date(event.date).toLocaleDateString()}
                      </Text>
                    </SpringPressable>
                  ))}
                </View>
              )}
              <SpringPressable onPress={() => setShowManualEntry(true)} haptic="light" accessibilityRole="button">
                <Text style={styles.manualLink}>Enter event manually</Text>
              </SpringPressable>
            </>
          )}
        </View>

        {/* Seat Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seat</Text>

          <View style={styles.gaToggle}>
            <Text style={styles.gaLabel}>General Admission</Text>
            <Switch
              value={isGA}
              onValueChange={setIsGA}
              trackColor={{ false: tokens.colors.card2, true: tokens.colors.success }}
              thumbColor={tokens.colors.white}
              ios_backgroundColor={tokens.colors.card2}
            />
          </View>

          {!isGA && (
            <View style={styles.seatInputs}>
              <TextInput
                style={[styles.input, styles.seatInput]}
                placeholder="Section"
                placeholderTextColor={tokens.colors.muteSoft}
                value={section}
                onChangeText={setSection}
              />
              <TextInput
                style={[styles.input, styles.seatInput]}
                placeholder="Row"
                placeholderTextColor={tokens.colors.muteSoft}
                value={row}
                onChangeText={setRow}
              />
              <TextInput
                style={[styles.input, styles.seatInput]}
                placeholder="Seat"
                placeholderTextColor={tokens.colors.muteSoft}
                value={seat}
                onChangeText={setSeat}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        {/* Barcode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Barcode (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter barcode number"
            placeholderTextColor={tokens.colors.muteSoft}
            value={barcode}
            onChangeText={setBarcode}
          />
          <Text style={styles.hint}>Or scan the barcode using the scan button above</Text>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Info (Optional)</Text>

          <TextInput
            style={styles.input}
            placeholder="Confirmation number"
            placeholderTextColor={tokens.colors.muteSoft}
            value={confirmationNumber}
            onChangeText={setConfirmationNumber}
          />

          <TextInput
            style={styles.input}
            placeholder="Purchase price"
            placeholderTextColor={tokens.colors.muteSoft}
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Notes"
            placeholderTextColor={tokens.colors.muteSoft}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <SpringPressable style={styles.submitButton} onPress={handleSubmit} disabled={loading} haptic="medium" accessibilityRole="button">
          {loading ? (
            <ActivityIndicator color={tokens.colors.inverseFg} />
          ) : (
            <>
              <Ionicons name="ticket" size={20} color={tokens.colors.inverseFg} />
              <Text style={styles.submitText}>Add Ticket</Text>
            </>
          )}
        </SpringPressable>
      </View>
    </SafeAreaView>
  );
}
