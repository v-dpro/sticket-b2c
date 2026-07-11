// components/timeline/format.ts — pure date/number helpers shared by the
// timeline cards. No theme access, no React.

const MONTH_ABBR = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

/** "2026-07" → "JUL 2026" (month markers). */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = Number(month) - 1;
  const abbr = MONTH_ABBR[idx] ?? '???';
  return `${abbr} ${year ?? ''}`.trim();
}

/** ISO date → "Jul 14" (card metadata lines). */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Whole days from the start of today until the given date (≥ 0). */
export function daysUntil(dateStr: string): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - startOfToday.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Countdown chip copy: "today" / "in 1d" / "in 76d". */
export function countdownLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  return days === 0 ? 'today' : `in ${days}d`;
}

/** Score → "9" or "8.5" (mono chips). */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
