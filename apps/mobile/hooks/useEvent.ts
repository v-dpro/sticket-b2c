import { useCallback, useEffect, useState } from 'react';

import { getEvent } from '../lib/api/events';
import type { EventDetails } from '../types/event';
import { getErrorMessage } from '../lib/api/errorUtils';

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getEvent(eventId);
      setEvent(data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const updateInterested = (isInterested: boolean) => {
    setEvent((prev) => {
      if (!prev) return prev;
      const nextCount = isInterested ? prev.interestedCount + 1 : Math.max(0, prev.interestedCount - 1);
      return {
        ...prev,
        isInterested,
        interestedCount: nextCount,
      };
    });
  };

  return {
    event,
    loading,
    error,
    refetch: fetchEvent,
    updateInterested,
  };
}
