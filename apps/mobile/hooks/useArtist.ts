import { useCallback, useEffect, useState } from 'react';
import { getArtist } from '../lib/api/artists';
import type { ArtistDetails } from '../types/artist';

export function useArtist(artistId: string) {
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtist = useCallback(async () => {
    if (!artistId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getArtist(artistId);
      setArtist(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load artist');
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  const updateFollowing = (isFollowing: boolean) => {
    setArtist((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isFollowing,
        followerCount: isFollowing ? prev.followerCount + 1 : prev.followerCount - 1,
      };
    });
  };

  return {
    artist,
    loading,
    error,
    refetch: fetchArtist,
    updateFollowing,
  };
}



