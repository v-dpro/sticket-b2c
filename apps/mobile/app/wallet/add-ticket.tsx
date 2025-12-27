import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAddTicket } from '../../hooks/useAddTicket';
import type { BarcodeFormat } from '../../types/ticket';
import { ensureTicketRemindersScheduled } from '../../lib/notifications/ticketReminders';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function AddTicketScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Add Ticket</Text>
        <Pressable onPress={() => router.push('/wallet/scan-ticket')}>
          <Ionicons name="scan" size={24} color="#8B5CF6" />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <Pressable onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close-circle" size={24} color="#6B6B8D" />
              </Pressable>
            </View>
          ) : showManualEntry ? (
            <View style={styles.manualEntry}>
              <TextInput
                style={styles.input}
                placeholder="Artist name"
                placeholderTextColor="#6B6B8D"
                value={artistName}
                onChangeText={setArtistName}
              />
              <TextInput
                style={styles.input}
                placeholder="Venue name"
                placeholderTextColor="#6B6B8D"
                value={venueName}
                onChangeText={setVenueName}
              />
              <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{eventDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar" size={20} color="#8B5CF6" />
              </Pressable>
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
              <Pressable onPress={() => setShowManualEntry(false)}>
                <Text style={styles.searchInstead}>Search for event instead</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search for event..."
                placeholderTextColor="#6B6B8D"
                value={eventSearch}
                onChangeText={handleEventSearch}
              />
              {searching && <ActivityIndicator style={styles.searchingIndicator} />}
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((event) => (
                    <Pressable key={event.id} style={styles.searchResult} onPress={() => handleSelectEvent(event)}>
                      <Text style={styles.resultArtist}>{event.artist.name}</Text>
                      <Text style={styles.resultDetails}>
                        {event.venue.name} • {new Date(event.date).toLocaleDateString()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable onPress={() => setShowManualEntry(true)}>
                <Text style={styles.manualLink}>Enter event manually</Text>
              </Pressable>
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
              trackColor={{ false: '#2D2D4A', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {!isGA && (
            <View style={styles.seatInputs}>
              <TextInput
                style={[styles.input, styles.seatInput]}
                placeholder="Section"
                placeholderTextColor="#6B6B8D"
                value={section}
                onChangeText={setSection}
              />
              <TextInput
                style={[styles.input, styles.seatInput]}
                placeholder="Row"
                placeholderTextColor="#6B6B8D"
                value={row}
                onChangeText={setRow}
              />
              <TextInput
                style={[styles.input, styles.seatInput]}
                placeholder="Seat"
                placeholderTextColor="#6B6B8D"
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
            placeholderTextColor="#6B6B8D"
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
            placeholderTextColor="#6B6B8D"
            value={confirmationNumber}
            onChangeText={setConfirmationNumber}
          />

          <TextInput
            style={styles.input}
            placeholder="Purchase price"
            placeholderTextColor="#6B6B8D"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Notes"
            placeholderTextColor="#6B6B8D"
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
        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          <LinearGradient
            colors={['#8B5CF6', '#E879F9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="ticket" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Add Ticket</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1E',
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  selectedEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  selectedEventInfo: {
    flex: 1,
  },
  selectedArtist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedVenue: {
    fontSize: 14,
    color: '#A0A0B8',
    marginTop: 2,
  },
  selectedDate: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 2,
  },
  searchingIndicator: {
    marginVertical: 12,
  },
  searchResults: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  searchResult: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4A',
  },
  resultArtist: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  resultDetails: {
    fontSize: 13,
    color: '#6B6B8D',
    marginTop: 2,
  },
  manualLink: {
    fontSize: 14,
    color: '#8B5CF6',
    textAlign: 'center',
  },
  manualEntry: {},
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  searchInstead: {
    fontSize: 14,
    color: '#8B5CF6',
    textAlign: 'center',
  },
  gaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  gaLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  seatInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  seatInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: -4,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: '#0A0B1E',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});



