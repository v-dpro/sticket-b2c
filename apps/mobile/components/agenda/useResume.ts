// A10 — "LAST NIGHT" resume source.
//
// Fires from either of two triggers:
//   1. A deferred memory draft exists (the reliable path — written by the
//      success screen's "save for morning", see components/log/memoryDraft).
//   2. The user's most recent log is unshared AND its show was within the
//      last ~18h ("last night"). The timeline payload carries no log
//      createdAt, so freshness is taken from the event date — which for a
//      show logged the next morning is exactly the "last night" window.
//
// Camera-roll auto-suggestions (scanning the photo library for last night's
// shots) are intentionally OUT OF SCOPE here — that's its own project.
//
// Dismiss clears any pending draft (+ its scheduled reminder) and marks the
// card dismissed for the rest of the day.

import { useCallback, useEffect, useState } from 'react';

import { getUserTimeline } from '../../lib/api/timeline';
import { useSession } from '../../hooks/useSession';
import { clearMemoryDraft, getMemoryDraft } from '../log/memoryDraft';
import { dismissForToday, isDismissedToday, RESUME_DISMISS_KEY } from './dismissal';

// "Last night" freshness window, measured from the show's event date.
const RECENT_LOG_WINDOW_MS = 18 * 60 * 60 * 1000;

export type ResumeItem = { logId: string; eventName: string };

export function useResume(): { item: ResumeItem | null; dismiss: () => void } {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [item, setItem] = useState<ResumeItem | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      // Dismissed today → stay hidden.
      if (await isDismissedToday(RESUME_DISMISS_KEY)) {
        if (alive) setItem(null);
        return;
      }

      // 1) Deferred draft — the reliable trigger.
      const draft = await getMemoryDraft();
      if (draft) {
        if (alive) setItem({ logId: draft.logId, eventName: draft.eventName || 'your show' });
        return;
      }

      // 2) Most recent log: unshared + show within the last ~18h.
      if (!userId) {
        if (alive) setItem(null);
        return;
      }
      try {
        const tl = await getUserTimeline(userId, { limit: 1 });
        const entry = tl.months?.[0]?.entries?.[0];
        if (entry && entry.sharedAt === null) {
          const eventMs = new Date(entry.event.date).getTime();
          const since = Date.now() - eventMs;
          if (!Number.isNaN(eventMs) && since >= 0 && since < RECENT_LOG_WINDOW_MS) {
            if (alive) setItem({ logId: entry.logId, eventName: entry.event.name || 'your show' });
            return;
          }
        }
      } catch {
        // timeline unavailable — no resume card
      }
      if (alive) setItem(null);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const dismiss = useCallback(() => {
    setItem(null);
    void clearMemoryDraft(); // clears any pending draft + its morning reminder
    void dismissForToday(RESUME_DISMISS_KEY);
  }, []);

  return { item, dismiss };
}
