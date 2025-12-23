import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAllBadges, getBadgeProgress, getUserBadges } from '../lib/api/badges';
import type { Badge, BadgeCategory, BadgeProgress, UserBadge } from '../types/badge';

export function useBadges(userId?: string) {
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [earned, prog, all] = await Promise.all([
        getUserBadges(userId),
        userId ? Promise.resolve([] as BadgeProgress[]) : getBadgeProgress(),
        getAllBadges(),
      ]);

      setEarnedBadges(earned);
      setProgress(prog);
      setAllBadges(all);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const badgesByCategory = useMemo(() => {
    return allBadges.reduce((acc, badge) => {
      (acc[badge.category] ||= []).push(badge);
      return acc;
    }, {} as Record<BadgeCategory, Badge[]>);
  }, [allBadges]);

  const earnedIds = useMemo(() => new Set(earnedBadges.map((b) => b.badge.id)), [earnedBadges]);
  const isBadgeEarned = useCallback((badgeId: string) => earnedIds.has(badgeId), [earnedIds]);

  const getProgressForBadge = useCallback((badgeId: string) => progress.find((p) => p.badge.id === badgeId), [progress]);

  const totalPoints = useMemo(() => earnedBadges.reduce((sum, b) => sum + (b.badge.points || 0), 0), [earnedBadges]);

  return {
    earnedBadges,
    progress,
    allBadges,
    badgesByCategory,
    loading,
    error,
    refresh: fetch,
    isBadgeEarned,
    getProgress: getProgressForBadge,
    totalPoints,
    earnedCount: earnedBadges.length,
    totalCount: allBadges.length,
  };
}



