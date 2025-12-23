import { useCallback, useEffect, useState } from 'react';
import { getVenueTips, removeUpvote, submitVenueTip, upvoteTip } from '../lib/api/venues';
import type { VenueTip } from '../types/venue';

export function useVenueTips(venueId: string) {
  const [tips, setTips] = useState<VenueTip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTips = useCallback(async () => {
    if (!venueId) return;

    setLoading(true);
    try {
      const data = await getVenueTips(venueId, { limit: 20 });
      setTips(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load tips:', err);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const addTip = async (text: string, category: string) => {
    try {
      const newTip = await submitVenueTip(venueId, { text, category });
      setTips((prev) => [newTip, ...prev]);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add tip:', err);
      return false;
    }
  };

  const toggleUpvote = async (tipId: string) => {
    const tip = tips.find((t) => t.id === tipId);
    if (!tip) return;

    // optimistic UI
    setTips((prev) =>
      prev.map((t) =>
        t.id === tipId
          ? {
              ...t,
              upvotes: t.upvotes + (t.userUpvoted ? -1 : 1),
              userUpvoted: !t.userUpvoted,
            }
          : t
      )
    );

    try {
      if (tip.userUpvoted) await removeUpvote(venueId, tipId);
      else await upvoteTip(venueId, tipId);
    } catch (err) {
      // rollback on failure
      setTips((prev) =>
        prev.map((t) =>
          t.id === tipId
            ? {
                ...t,
                upvotes: t.upvotes + (t.userUpvoted ? -1 : 1),
                userUpvoted: !t.userUpvoted,
              }
            : t
        )
      );

      // eslint-disable-next-line no-console
      console.error('Failed to toggle upvote:', err);
    }
  };

  return {
    tips,
    loading,
    addTip,
    toggleUpvote,
    refresh: fetchTips,
  };
}



