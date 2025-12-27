import { useCallback, useEffect, useMemo, useState } from 'react';

import { getMyProfile, getUserProfile } from '../lib/api/profile';
import type { LocalUser } from '../lib/local/users';
import { listLogsForUser } from '../lib/local/repo/logsRepo';
import { ensureProfile as ensureLocalProfile, getProfile as getLocalProfile } from '../lib/local/repo/profileRepo';
import type { UserProfile } from '../types/profile';
import { useSession } from './useSession';
import { getErrorMessage } from '../lib/api/errorUtils';

async function buildLocalOwnProfile(user: LocalUser): Promise<UserProfile> {
  await ensureLocalProfile(user.id);
  const local = await getLocalProfile(user.id);
  const logs = await listLogsForUser(user.id);

  const usernameFromEmail = (user.email.split('@')[0] ?? '').trim().toLowerCase();
  const username =
    (local?.username ?? undefined) ||
    (usernameFromEmail || undefined) ||
    user.id.replace(/^user_/, '').slice(0, 12) ||
    'user';

  const displayName = (local?.displayName ?? undefined) || username;

  const artistIds = new Set<string>();
  const venueIds = new Set<string>();
  for (const l of logs) {
    if (l.event?.artist?.id) artistIds.add(l.event.artist.id);
    if (l.event?.venue?.id) venueIds.add(l.event.venue.id);
  }

  return {
    id: user.id,
    username,
    displayName,
    bio: local?.bio ?? undefined,
    avatarUrl: local?.avatarUrl ?? undefined,
    city: local?.city ?? undefined,
    privacySetting: 'PUBLIC',
    createdAt: (local?.createdAt ?? user.createdAt) || new Date().toISOString(),
    isOwnProfile: true,
    stats: {
      shows: logs.length,
      artists: artistIds.size,
      venues: venueIds.size,
      followers: 0,
      following: 0,
    },
    badges: [],
  };
}

export function useProfile(userId?: string) {
  const { user: currentUser } = useSession();

  const currentUserId = currentUser?.id ?? null;
  const isOwnProfile = useMemo(() => !userId || (currentUserId ? userId === currentUserId : false), [userId, currentUserId]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOwnProfile) {
        if (!currentUser) {
          setProfile(null);
          setError('Please sign in to view your profile');
          return;
        }

        // Local-only users (id starts with "user_") do not exist in the API DB,
        // so build profile from the local DB and avoid the slow 401/404 loop.
        if (currentUser.id.startsWith('user_')) {
          setProfile(await buildLocalOwnProfile(currentUser));
          return;
        }

        // Prefer API-backed "me" when available; fall back to local profile in dev/offline.
        try {
          const data = await getMyProfile();
          setProfile({ ...data, isOwnProfile: true });
          return;
        } catch (apiErr: any) {
          const status = apiErr?.response?.status;
          if (status === 401 || status === 404 || status >= 500) {
            setProfile(await buildLocalOwnProfile(currentUser));
            return;
          }
          throw apiErr;
        }
      }

      const data = await getUserProfile(userId!);
      setProfile({ ...data, isOwnProfile });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile, currentUser]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    isOwnProfile,
  };
}




