// Explore stream formatting helpers — pure (no theme, no React), mirrors
// the timeline/memory format.ts convention. Every line these build is DATA:
// concrete counts, names, dates — never "recommended for you" copy.

import type { ExplorePerson } from '../../lib/api/explore';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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
