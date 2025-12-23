import { useCallback, useEffect, useState } from 'react';

import { getEvent } from '../lib/api/events';
import type { EventDetails } from '../types/event';
import { getEventById as getLocalEventById, type Event as LocalEvent } from '../lib/local/repo/eventsRepo';

function localEventToDetails(e: LocalEvent): EventDetails {
  return {
    id: e.id,
    name: e.name,
    date: e.date,
    imageUrl: e.imageUrl ?? undefined,
    artist: {
      id: e.artist.id,
      name: e.artist.name,
      imageUrl: e.artist.imageUrl ?? undefined,
      genres: e.artist.genres,
    },
    venue: {
      id: e.venue.id,
      name: e.venue.name,
      city: e.venue.city,
      state: e.venue.state ?? undefined,
      country: e.venue.country,
    },
    logCount: 0,
    interestedCount: 0,
    isInterested: false,
    userLog: null,
    friendsWhoWent: [],
    friendsInterested: [],
    setlist: [],
    moments: [],
  };
}

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
      // Fallback to local DB (logged shows) when the remote event doesn't exist.
      try {
        const local = await getLocalEventById(eventId);
        if (local) {
          setEvent(localEventToDetails(local));
          return;
        }
      } catch {
        // ignore
      }

      setError(err.response?.data?.error || 'Failed to load event');
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



