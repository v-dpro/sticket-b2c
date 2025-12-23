import { useState } from 'react';
import { followArtist, unfollowArtist } from '../lib/api/artists';

export function useArtistFollow(initialIsFollowing: boolean = false) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const toggleFollow = async (artistId: string) => {
    setLoading(true);
    try {
      if (isFollowing) {
        await unfollowArtist(artistId);
        setIsFollowing(false);
      } else {
        await followArtist(artistId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow toggle failed:', error);
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



