// Memory draft + morning reminder — powers the success screen's night-time
// "Save for morning" CTA (Phase A · A9). When a show is scored between 20:00
// and 04:00, the user can defer the photos: we persist a lightweight draft
// marker and schedule ONE local notification at the next 10:00 that deep-links
// straight back into /log/memory.
//
// Everything here degrades silently. The AsyncStorage draft is the source of
// truth and is written unconditionally; the notification is best-effort, so a
// denied permission (or a simulator) simply drops the nudge, not the draft.
//
// The scheduled notification carries `data.url = '/log/memory?logId=...'`; the
// app's notification dispatcher (lib/notifications/notificationHandler) honors
// that explicit deep-link before its typed switch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/** AsyncStorage key for the pending draft marker (shape: {@link MemoryDraft}). */
export const MEMORY_DRAFT_KEY = 'sticket.memory-draft';
// Sidecar key: the scheduled notification id, kept out of the draft object so
// the draft's shape stays exactly { logId, eventId, eventName, savedAt }.
const MEMORY_DRAFT_NOTIF_KEY = 'sticket.memory-draft.notifId';

export type MemoryDraft = {
  logId: string;
  eventId?: string;
  eventName?: string;
  /** ISO timestamp of when the draft was deferred. */
  savedAt: string;
};

/** The next wall-clock 10:00 in local time, strictly in the future. */
function nextMorning(now: Date = new Date()): Date {
  const target = new Date(now);
  target.setHours(10, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Persist a "save for morning" draft and schedule its 10:00 reminder.
 * Resolves once both have been attempted; never throws.
 */
export async function saveMemoryForMorning(input: {
  logId: string;
  eventId?: string;
  eventName?: string;
}): Promise<void> {
  const draft: MemoryDraft = {
    logId: input.logId,
    eventId: input.eventId,
    eventName: input.eventName,
    savedAt: new Date().toISOString(),
  };

  // Draft first, unconditionally — it must survive even if notifications fail.
  try {
    await AsyncStorage.setItem(MEMORY_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable — nothing more we can do
  }

  // Best-effort morning nudge. Request permission only if not already granted;
  // a denial leaves the draft in place and skips the reminder.
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.eventName ? input.eventName : 'Last night’s show',
        body: 'Last night’s memory is waiting — add the photos',
        data: {
          type: 'memory_draft',
          url: `/log/memory?logId=${encodeURIComponent(input.logId)}`,
          logId: input.logId,
          ...(input.eventId ? { eventId: input.eventId } : {}),
        },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextMorning() },
    });

    await AsyncStorage.setItem(MEMORY_DRAFT_NOTIF_KEY, notifId);
  } catch {
    // scheduling failed — the draft still stands
  }
}

/** Reads the pending draft, if any. */
export async function getMemoryDraft(): Promise<MemoryDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemoryDraft;
    return parsed?.logId ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Clear the draft and cancel its morning reminder. Pass a `logId` to only clear
 * when it matches the stored draft — used when the memory screen opens, so an
 * unrelated pending draft survives.
 */
export async function clearMemoryDraft(logId?: string): Promise<void> {
  try {
    if (logId) {
      const draft = await getMemoryDraft();
      if (draft && draft.logId !== logId) return;
    }
    const notifId = await AsyncStorage.getItem(MEMORY_DRAFT_NOTIF_KEY);
    if (notifId) {
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    }
    await AsyncStorage.multiRemove([MEMORY_DRAFT_KEY, MEMORY_DRAFT_NOTIF_KEY]);
  } catch {
    // ignore
  }
}
