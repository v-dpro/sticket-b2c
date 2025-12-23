import { useCallback, useState } from 'react';

import { checkForBadges } from '../lib/api/badges';
import type { Badge } from '../types/badge';

export function useBadgeChecker() {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (eventId?: string): Promise<Badge[]> => {
    setChecking(true);
    setError(null);
    try {
      const res = await checkForBadges(eventId);
      return res.newBadges || [];
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to check badges');
      return [];
    } finally {
      setChecking(false);
    }
  }, []);

  return { check, checking, error };
}



