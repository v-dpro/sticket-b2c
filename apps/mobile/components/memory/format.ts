// Memory viewer formatting helpers — mirrors FeedCard v3's over-photo
// chrome formatting exactly (mono date, compact mono age, 1–10 score).

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatMemoryDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Compact mono age for the author pill, e.g. "11H", "3D", "2W". */
export function formatMemoryAge(dateStr?: string): string {
  if (!dateStr) return '';
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'NOW';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}M`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}D`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}W`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}MO`;
  return `${Math.floor(d / 365)}Y`;
}

/** Log ratings are stored on a 1–10 scale (see log/details.tsx). */
export function formatMemoryScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
