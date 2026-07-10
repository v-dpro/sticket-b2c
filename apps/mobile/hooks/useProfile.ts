import { useCallback, useEffect, useMemo, useState } from 'react';

import { getMyProfile, getUserProfile } from '../lib/api/profile';
import type { UserProfile } from '../types/profile';
import { useSession } from './useSession';
import { getErrorMessage } from '../lib/api/errorUtils';

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

        const data = await getMyProfile();
        setProfile({ ...data, isOwnProfile: true });
        return;
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
