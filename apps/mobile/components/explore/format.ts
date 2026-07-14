// Explore stream formatting helpers — pure (no theme, no React), mirrors
// the timeline/memory format.ts convention. Every line these build is DATA:
// concrete counts, names, dates — never "recommended for you" copy.

import type { ExplorePerson } from '../../lib/api/explore';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Date → "10:00 AM" (uppercased 12h clock, used inside mono windows). */
function timeOf(d: Date): string {
  return d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toUpperCase();
}

/** ISO date → { month: "AUG", day: "22" } for the stacked date block. */
export function dateBlock(dateStr: string): { month: string; day: string } | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return { month: MONTHS[d.getMonth()], day: String(d.getDate()) };
}

/** ISO date → "AUG 22" (inline mono metadata). */
export function monoDate(dateStr: string): string {
  const b = dateBlock(dateStr);
  return b ? `${b.month} ${b.day}` : '';
}

/** Presale start → "JUL 18 · 10AM" / "JUL 18 · 9:30AM" (chip datetime). */
export function presaleWhen(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const h24 = d.getHours();
  const mins = d.getMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = mins === 0 ? `${h12}${ampm}` : `${h12}:${String(mins).padStart(2, '0')}${ampm}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${time}`;
}

/**
 * Presale window → "WED JUL 16 · 10:00 AM–10:00 PM". Same-day windows collapse
 * the end to a bare time; cross-day windows spell the end date. No end ⇒ just
 * the start. This is the planning value — the exact window in mono.
 */
export function presaleWindow(startStr: string, endStr?: string | null): string {
  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return '';
  const head = `${DOW[start.getDay()]} ${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const startTime = timeOf(start);
  if (endStr) {
    const end = new Date(endStr);
    if (!Number.isNaN(end.getTime())) {
      const sameDay =
        end.getFullYear() === start.getFullYear() &&
        end.getMonth() === start.getMonth() &&
        end.getDate() === start.getDate();
      return sameDay
        ? `${head} · ${startTime}–${timeOf(end)}`
        : `${head} · ${startTime} → ${MONTHS[end.getMonth()]} ${end.getDate()} ${timeOf(end)}`;
    }
  }
  return `${head} · ${startTime}`;
}

/**
 * Close-urgency for a presale's RIGHT-rail readout. Live windows are the whole
 * point of the hub, so we count down to the CLOSE: a ticking HH:MM:SS in the
 * last day, "2D 20H" inside three days (both flagged imminent → fg border),
 * else a plain "CLOSES JUL 25" date. No end ⇒ "OPEN" (on sale, no known close).
 */
const _HR = 3600000;
const _DAY = 86400000;
export type PresaleClose = { eyebrow: string; value: string; ticking: boolean; imminent: boolean };
export function presaleClose(endStr?: string | null, now: number = Date.now()): PresaleClose {
  if (!endStr) return { eyebrow: 'STATUS', value: 'OPEN', ticking: false, imminent: true };
  const end = new Date(endStr);
  const t = end.getTime();
  if (Number.isNaN(t)) return { eyebrow: '', value: '', ticking: false, imminent: false };
  const ms = t - now;
  if (ms <= 0) return { eyebrow: 'CLOSED', value: '—', ticking: false, imminent: false };
  const pad = (n: number) => String(n).padStart(2, '0');
  if (ms < _DAY) {
    const h = Math.floor(ms / _HR);
    const m = Math.floor((ms % _HR) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { eyebrow: 'CLOSES IN', value: `${pad(h)}:${pad(m)}:${pad(s)}`, ticking: true, imminent: true };
  }
  if (ms < 3 * _DAY) {
    const d = Math.floor(ms / _DAY);
    const h = Math.floor((ms % _DAY) / _HR);
    return { eyebrow: 'CLOSES IN', value: `${d}D ${h}H`, ticking: false, imminent: true };
  }
  return { eyebrow: 'CLOSES', value: `${MONTHS[end.getMonth()]} ${end.getDate()}`, ticking: false, imminent: false };
}

/**
 * State-aware presale timing — the single most actionable line. Once a window
 * is OPEN the start is stale (TM's Platinum/VIP sales open months ahead and run
 * for the whole cycle), so a live row surfaces the CLOSE ("CLOSES WED JUL 16 ·
 * 11:00 PM"); a not-yet-open row surfaces the OPEN. This replaces a raw
 * start→end window, which reads backwards when the start is a year in the past.
 */
export function presaleTiming(startStr: string, endStr?: string | null, now: number = Date.now()): string {
  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return '';
  const end = endStr ? new Date(endStr) : null;
  const endValid = end && !Number.isNaN(end.getTime());
  if (start.getTime() <= now) {
    return endValid
      ? `CLOSES ${DOW[end!.getDay()]} ${MONTHS[end!.getMonth()]} ${end!.getDate()} · ${timeOf(end!)}`
      : 'ON SALE NOW';
  }
  return `OPENS ${DOW[start.getDay()]} ${MONTHS[start.getMonth()]} ${start.getDate()} · ${timeOf(start)}`;
}

/**
 * General on-sale → "ON SALE JUL 20 · 10:00 AM". Only an upcoming milestone is
 * worth a line; a past onsale (tickets already public) is noise, so return ''.
 */
export function onsaleLine(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() <= now) return '';
  return `ON SALE ${MONTHS[d.getMonth()]} ${d.getDate()} · ${timeOf(d)}`;
}

/** Show line → "MSG · NEW YORK · AUG 22" from venue/city/date parts. */
export function showLine(
  venueName?: string | null,
  venueCity?: string | null,
  eventDate?: string | null,
): string {
  const parts: string[] = [];
  if (venueName) parts.push(venueName);
  if (venueCity) parts.push(venueCity);
  if (eventDate) {
    const d = monoDate(eventDate);
    if (d) parts.push(d);
  }
  return parts.join(' · ');
}

/**
 * Countdown to a presale start — hour-granular since presales are timed.
 * "LIVE" once open, then "45 MIN" / "6 HRS" / "3 DAYS". Mirrors the Plan tab.
 */
export function presaleCountdown(startStr: string, now: number = Date.now()): string {
  const start = new Date(startStr).getTime();
  if (Number.isNaN(start)) return '';
  if (start <= now) return 'LIVE';
  const diff = start - now;
  if (diff < 3600000) return `${Math.max(1, Math.ceil(diff / 60000))} MIN`;
  if (diff < 86400000) {
    const hrs = Math.ceil(diff / 3600000);
    return `${hrs} ${hrs === 1 ? 'HR' : 'HRS'}`;
  }
  const days = Math.ceil(diff / 86400000);
  return `${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
}

/** Whether the event date is today or later (drives GOING vs WENT verbs). */
export function isUpcoming(dateStr: string): boolean {
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d >= startOfToday.getTime();
}

/** Lead name for a caption — username, uppercased by the mono style. */
function leadName(person: ExplorePerson): string {
  return person.username;
}

/**
 * Facepile caption — "DIEGO GOING · 6 INTERESTED" style. Built ONLY from
 * data on the wire: friendsWent names/count, plus optional extra segments.
 */
export function crowdCaption(
  friends: ExplorePerson[],
  verb: 'GOING' | 'WENT',
  ...extra: (string | null)[]
): string {
  const parts: string[] = [];
  if (friends.length === 1) parts.push(`${leadName(friends[0])} ${verb}`);
  else if (friends.length > 1) parts.push(`${leadName(friends[0])} +${friends.length - 1} ${verb}`);
  for (const seg of extra) if (seg) parts.push(seg);
  return parts.join(' · ');
}

/**
 * Rising-artist reason line — concrete, from friendsWent / counts.
 * "MAYA + 2 SAW LIVE" / "3 FRIENDS SAW" territory; falls back to log or
 * follower counts. Never editorial copy.
 */
export function risingReason(
  friends: ExplorePerson[],
  logCount: number,
  followerCount: number,
): string {
  if (friends.length === 1) return `${friends[0].username} SAW LIVE`;
  if (friends.length > 1) return `${friends.length} FRIENDS SAW`;
  if (logCount > 0) return `${logCount} ${logCount === 1 ? 'LOG' : 'LOGS'}`;
  if (followerCount > 0) return `${followerCount} TRACKING`;
  return 'NEW ON STICKET';
}

/** Crowd-post byline — "MAYA" (+ " · VIA FRIENDS+" for 2nd degree). */
export function crowdPostByline(user: ExplorePerson): string {
  return user.degree === 2 ? `${user.username} · VIA FRIENDS+` : user.username;
}
