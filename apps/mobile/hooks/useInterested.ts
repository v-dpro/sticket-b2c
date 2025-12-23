import { useCallback, useState } from 'react';

import { markInterested, removeInterested } from '../lib/api/discovery';

export function useInterested(eventId: string, initialState: boolean = false) {
  const [isInterested, setIsInterested] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      if (isInterested) {
        await removeInterested(eventId);
        setIsInterested(false);
      } else {
        await markInterested(eventId);
        setIsInterested(true);
      }
    } catch (error) {
      console.error('Failed to toggle interested:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, isInterested]);

  return { isInterested, toggle, loading, setIsInterested };
}




