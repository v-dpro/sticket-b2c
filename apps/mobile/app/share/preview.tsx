import React, { useMemo } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import type { ShareCardData } from '../../types/share';
import { SharePreview } from '../../components/share/SharePreview';

function safeJsonParse<T>(raw?: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

export default function SharePreviewScreen() {
  const params = useLocalSearchParams<{ data?: string; link?: string }>();

  const data = useMemo<ShareCardData>(() => {
    const parsed = safeJsonParse<ShareCardData>(params.data);
    if (parsed) return parsed;

    // Fallback preview
    return {
      type: 'log',
      log: {
        artistName: 'Your Artist',
        venueName: 'Your Venue',
        venueCity: 'Your City',
        date: new Date().toISOString(),
        rating: 5,
      },
    };
  }, [params.data]);

  return (
    <>
      <Stack.Screen options={{ title: 'Share', headerShown: true }} />
      <SharePreview data={data} link={params.link} />
    </>
  );
}



