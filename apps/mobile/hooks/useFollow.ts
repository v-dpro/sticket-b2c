import { useState } from 'react';

import { followUser, unfollowUser } from '../lib/api/profile';

export function useFollow(initialIsFollowing: boolean = false) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const toggleFollow = async (userId: string) => {
    setLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await followUser(userId);
        setIsFollowing(true);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Follow toggle failed:', error);
      // Revert on error
      setIsFollowing(isFollowing);
    } finally {
      setLoading(false);
    }
  };

  return {
    isFollowing,
    setIsFollowing,
    toggleFollow,
    loading,
  };
}




