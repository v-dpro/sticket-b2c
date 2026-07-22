// presaleInstructions — turns a matched presale's raw fields into the
// ordered "how to plan for this" steps shown on the event screen. Pure (no
// theme, no React), mirrors the explore/format.ts convention.
//
// Compliance: presale CODES are never modeled or surfaced (see
// hooks/usePresales.ts) — the "have your presale code ready" line is a
// generic nudge, never a specific code.

import { format, isToday, isTomorrow } from 'date-fns';

export type PresaleInstructionInput = {
  presaleType: string;
  presaleStart: string;
  presaleEnd?: string | null;
  onsaleStart?: string | null;
  signupUrl?: string | null;
  signupDeadline?: string | null;
};

/** ISO date → "today at 10:00 AM" / "tomorrow at 9:30 AM" / "Jul 20 at 10:00 AM". */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (isToday(d)) return `today at ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `tomorrow at ${format(d, 'h:mm a')}`;
  return format(d, "MMM d 'at' h:mm a");
}

/** "Citi Presale" / "Verified Fan" → "Citi presale" / "Verified Fan presale". */
function presaleLabel(presaleType: string): string {
  const stripped = presaleType.replace(/\s*presale\s*$/i, '').trim();
  return stripped ? `${stripped} presale` : 'presale';
}

/**
 * Ordered, short, product-y steps to plan around a presale: register (if a
 * signup gate exists) → the presale window itself → general on-sale (if
 * known) → set an alert → buy. The first step is the registration step
 * whenever one exists, so callers can deep-link just that row to
 * `signupUrl` by index.
 */
export function presaleInstructions(presale: PresaleInstructionInput): string[] {
  const label = presaleLabel(presale.presaleType);
  const steps: string[] = [];

  if (presale.signupUrl || presale.signupDeadline) {
    steps.push(
      presale.signupDeadline
        ? `Register for the ${label} — sign up by ${when(presale.signupDeadline)}.`
        : `Register for the ${label} before it opens.`,
    );
  }

  steps.push(
    presale.presaleEnd
      ? `Presale opens ${when(presale.presaleStart)} and closes ${when(presale.presaleEnd)} — have your presale code ready.`
      : `Presale opens ${when(presale.presaleStart)} — have your presale code ready.`,
  );

  if (presale.onsaleStart) {
    steps.push(`General on-sale opens ${when(presale.onsaleStart)}.`);
  }

  steps.push('Set an alert and we’ll ping you when it opens.');
  steps.push('Grab tickets the moment it’s live.');

  return steps;
}
