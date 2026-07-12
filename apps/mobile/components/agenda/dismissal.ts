// Per-day dismissal for the pinned agenda cards (A6 "TONIGHT", A10 "LAST
// NIGHT"). Each card stashes today's yyyy-mm-dd under its own key; the card
// stays hidden for the rest of the calendar day and reappears the next day.

import AsyncStorage from '@react-native-async-storage/async-storage';

/** A6 — dismissed-today marker for the TONIGHT card. */
export const TONIGHT_DISMISS_KEY = 'sticket.tonight-dismissed';
/** A10 — dismissed-today marker for the LAST NIGHT resume card. */
export const RESUME_DISMISS_KEY = 'sticket.resume-dismissed';

/** Local calendar day as yyyy-mm-dd (the value stored on dismiss). */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True when `storageKey` was dismissed earlier today. Degrades to false. */
export async function isDismissedToday(storageKey: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey)) === todayKey();
  } catch {
    return false;
  }
}

/** Mark `storageKey` dismissed for the rest of today. Never throws. */
export async function dismissForToday(storageKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, todayKey());
  } catch {
    // storage unavailable — the card simply reappears next mount
  }
}
