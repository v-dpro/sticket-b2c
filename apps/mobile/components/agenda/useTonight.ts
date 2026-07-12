// A6 — "TONIGHT" one-tap log source.
//
// Fires when the signed-in user has a wallet ticket OR a tracked event whose
// date lands TODAY (and that isn't already logged). Reads the existing
// concert-life payload (upcomingTickets + tracking + upcomingLogs). A ticket
// is preferred over a tracked event because it carries seat coordinates the
// log flow can prefill. Dismissible per calendar day.

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useConcertLife } from '../../hooks/useConcertLife';
import { dismissForToday, isDismissedToday, TONIGHT_DISMISS_KEY } from './dismissal';

export type TonightItem = {
  eventId: string;
  eventName: string;
  venueName: string;
  section?: string;
  row?: string;
  seat?: string;
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isTonight(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= startOfToday() && t < startOfToday() + 86400000;
}

export function useTonight(): { item: TonightItem | null; dismiss: () => void } {
  const { data } = useConcertLife();
  // null = dismissal check unresolved (render nothing until we know).
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void isDismissedToday(TONIGHT_DISMISS_KEY).then((d) => {
      if (alive) setDismissed(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  const item = useMemo<TonightItem | null>(() => {
    if (dismissed !== false || !data) return null;

    // Skip events already logged (no point prompting a fresh log for them).
    const logged = new Set<string>(
      ((data.upcomingLogs ?? []) as any[]).map((l) => l.event?.id).filter(Boolean),
    );
    const eligible = (raw: any) =>
      raw?.event?.id && isTonight(raw.date) && !logged.has(raw.event.id);

    // Ticket first (seat prefill), then a tracked/interested event.
    const chosen =
      ((data.upcomingTickets ?? []) as any[]).find(eligible) ??
      ((data.tracking ?? []) as any[]).find(eligible);
    if (!chosen?.event?.id) return null;

    return {
      eventId: String(chosen.event.id),
      eventName: chosen.event.name || chosen.event.artist?.name || 'Tonight’s show',
      venueName: chosen.event.venue?.name || 'Venue TBA',
      section: chosen.section ?? undefined,
      row: chosen.row ?? undefined,
      seat: chosen.seat ?? undefined,
    };
  }, [data, dismissed]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void dismissForToday(TONIGHT_DISMISS_KEY);
  }, []);

  return { item, dismiss };
}
