import React from 'react';
import { View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';

import type { Ticket } from '../../types/ticket';
import { SpringPressable } from '../ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface TicketActionsProps {
  ticket: Ticket;
  onSell: () => void;
  onDelete: () => void;
}

export function TicketActions({ ticket, onSell, onDelete }: TicketActionsProps) {
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 16,
      marginHorizontal: 16,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      marginTop: 16,
    },
    action: { alignItems: 'center', flex: 1 },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    deleteIcon: {
      backgroundColor: t.isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(220, 38, 38, 0.08)',
    },
    actionText: { fontSize: 12, color: t.colors.textSoft, textAlign: 'center', fontWeight: '500' },
    deleteText: { color: t.colors.error },
  }));

  const handleAddToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Calendar access is needed to add events.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const modifiable = calendars.filter((c) => c.allowsModifications);

      const defaultCalendar =
        modifiable.find((cal) => (cal as any).isPrimary) ||
        modifiable.find((cal) => cal.source?.name === 'Default') ||
        modifiable[0] ||
        calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Error', 'No calendar available.');
        return;
      }

      const eventDate = new Date(ticket.event.date);
      const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: `${ticket.event.artist.name} at ${ticket.event.venue.name}`,
        location: `${ticket.event.venue.name}, ${ticket.event.venue.city}`,
        startDate: eventDate,
        endDate,
        notes: ticket.isGeneralAdmission
          ? 'General Admission'
          : `Section ${ticket.section || ''}${ticket.row ? `, Row ${ticket.row}` : ''}${ticket.seat ? `, Seat ${ticket.seat}` : ''}`,
      });

      Alert.alert('Added!', 'Event added to your calendar.');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Calendar error:', error);
      Alert.alert('Error', 'Failed to add to calendar.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Ticket', 'Are you sure you want to remove this ticket from your wallet?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.container}>
      <SpringPressable style={styles.action} onPress={handleAddToCalendar} haptic="light" accessibilityRole="button">
        <View style={styles.iconCircle}>
          <Ionicons name="calendar" size={20} color={tokens.colors.fg} />
        </View>
        <Text style={styles.actionText}>Add to Calendar</Text>
      </SpringPressable>

      {ticket.status === 'KEEPING' && (
        <SpringPressable style={styles.action} onPress={onSell} haptic="light" accessibilityRole="button">
          <View style={styles.iconCircle}>
            <Ionicons name="pricetag" size={20} color={tokens.colors.fg} />
          </View>
          <Text style={styles.actionText}>Sell Ticket</Text>
        </SpringPressable>
      )}

      <SpringPressable style={styles.action} onPress={handleDelete} haptic="medium" accessibilityRole="button">
        <View style={[styles.iconCircle, styles.deleteIcon]}>
          <Ionicons name="trash" size={20} color={tokens.colors.error} />
        </View>
        <Text style={[styles.actionText, styles.deleteText]}>Remove</Text>
      </SpringPressable>
    </View>
  );
}
