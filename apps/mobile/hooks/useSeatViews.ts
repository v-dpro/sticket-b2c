import { useCallback, useEffect, useState } from 'react';
import { getSeatViews } from '../lib/api/venues';
import type { SeatView } from '../types/venue';

export function useSeatViews(venueId: string, section?: string) {
  const [seatViews, setSeatViews] = useState<SeatView[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeatViews = useCallback(async () => {
    if (!venueId) return;

    setLoading(true);
    try {
      const data = await getSeatViews(venueId, { section, limit: 50 });
      setSeatViews(data);

      const uniqueSections = [...new Set(data.map((s) => s.section))].sort();
      setSections(uniqueSections);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load seat views:', err);
    } finally {
      setLoading(false);
    }
  }, [venueId, section]);

  useEffect(() => {
    fetchSeatViews();
  }, [fetchSeatViews]);

  return {
    seatViews,
    sections,
    loading,
    refresh: fetchSeatViews,
  };
}



