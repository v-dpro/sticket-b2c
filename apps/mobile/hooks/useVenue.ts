import { useCallback, useEffect, useState } from 'react';
import { getVenue } from '../lib/api/venues';
import type { VenueDetails, VenueRatingsSubmission } from '../types/venue';

export function useVenue(venueId: string) {
  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenue = useCallback(async () => {
    if (!venueId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getVenue(venueId);
      setVenue(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load venue');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchVenue();
  }, [fetchVenue]);

  const updateRatings = (ratings: VenueRatingsSubmission) => {
    setVenue((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        userRatings: ratings,
      };
    });
  };

  return {
    venue,
    loading,
    error,
    refetch: fetchVenue,
    updateRatings,
  };
}



