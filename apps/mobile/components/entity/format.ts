// components/entity/format.ts — pure date/number helpers for the entity
// pages (artist / tour / event / venue). No theme access, no React.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** ISO date → "JUL 14" (mono date chips). */
export function monoDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** ISO date → "JUL 14 2026" (mono metadata lines). */
export function monoDateYear(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

/** ISO date → "JUL 12 · 10:00 AM" (presale windows). */
export function monoDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const time = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toUpperCase();
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${time}`;
}

/** ISO date → 4-digit year string, or '' when unparseable. */
export function yearOf(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getFullYear());
}

/** Score → "9" or "8.5" (mono chips / stats). */
export function formatScore(score: number): string {
  const rounded = Math.round(score * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** True when the two ISO dates fall on the same calendar day. */
export function sameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** True when the ISO date is before the start of today (a past show). */
export function isPast(dateStr: string): boolean {
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d < startOfToday.getTime();
}
