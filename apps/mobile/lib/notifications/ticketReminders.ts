import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { Ticket } from '../../types/ticket';

type Stored = {
  showReminderId?: string;
  postShowId?: string;
  eventDate?: string;
};

const storageKey = (ticketId: string) => `ticket_reminders:${ticketId}`;

function safeDate(dateIso: string): Date | null {
  const d = new Date(dateIso);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function ensureTicketRemindersScheduled(ticket: Ticket) {
  try {
    const existingRaw = await AsyncStorage.getItem(storageKey(ticket.id));
    const existing: Stored | null = existingRaw ? (JSON.parse(existingRaw) as Stored) : null;

    // If we've already scheduled for this exact event date, don't reschedule.
    if (existing?.eventDate === ticket.event.date && (existing.showReminderId || existing.postShowId)) {
      return;
    }

    const eventDate = safeDate(ticket.event.date);
    if (!eventDate) return;

    const now = new Date();

    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }

    // Show reminder: 24h before start
    const reminderAt = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);

    // Post-show prompt: assume show ends 3h after start
    const postShowAt = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

    const toStore: Stored = { eventDate: ticket.event.date };

    if (reminderAt > now) {
      const showReminderId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Tomorrow: ${ticket.event.artist.name}`,
          body: `Don't forget — ${ticket.event.venue.name}`,
          data: { type: 'show_reminder', eventId: ticket.event.id, ticketId: ticket.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt },
      });
      toStore.showReminderId = showReminderId;
    }

    if (postShowAt > now) {
      const postShowId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `How was ${ticket.event.artist.name}?`,
          body: 'Log your night while it’s fresh.',
          data: { type: 'post_show', eventId: ticket.event.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: postShowAt },
      });
      toStore.postShowId = postShowId;
    }

    await AsyncStorage.setItem(storageKey(ticket.id), JSON.stringify(toStore));
  } catch {
    // ignore scheduling/storage failures
  }
}



