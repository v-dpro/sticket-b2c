import { apiClient } from './client';
import type { Badge, BadgeProgress, UserBadge } from '../../types/badge';

// Get user's earned badges
export async function getUserBadges(userId?: string): Promise<UserBadge[]> {
  // Own profile (full badge definitions)
  if (!userId) {
    const response = await apiClient.get('/badges/mine');
    return response.data;
  }

  // Other users (legacy endpoint). Best-effort join against catalog.
  const [earnedRes, allRes] = await Promise.all([apiClient.get(`/users/${userId}/badges`), apiClient.get('/badges')]);
  const earned = earnedRes.data as Array<{ id: string; name: string; description: string; iconUrl?: string; earnedAt: string }>;
  const all = allRes.data as Badge[];

  const byName = new Map(all.map((b) => [b.name, b] as const));

  return earned.map((ub) => {
    const matched = byName.get(ub.name);
    const badge: Badge =
      matched ??
      ({
        id: `legacy_${ub.id}`,
        name: ub.name,
        description: ub.description,
        category: 'special',
        rarity: 'common',
        icon: 'ribbon-outline',
        criteria: { type: 'first_show' },
        points: 0,
      } as const);

    return {
      id: ub.id,
      badge,
      earnedAt: ub.earnedAt,
    };
  });
}

// Get badge progress
export async function getBadgeProgress(): Promise<BadgeProgress[]> {
  const response = await apiClient.get('/badges/progress');
  return response.data;
}

// Get all badges (catalog)
export async function getAllBadges(): Promise<Badge[]> {
  const response = await apiClient.get('/badges');
  return response.data;
}

// Check for new badges (can be called after logging)
export async function checkForBadges(eventId?: string): Promise<{ newBadges: Badge[] }> {
  const response = await apiClient.post('/badges/check', eventId ? { eventId } : {});
  return response.data;
}



