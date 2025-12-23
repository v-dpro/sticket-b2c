import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

// NOTE: RN host refs are tricky to type across versions; keep this permissive.
export async function generateCardImage(cardRef: RefObject<any>): Promise<string | null> {
  try {
    if (!cardRef.current) return null;

    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    return uri;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Card generation error:', error);
    return null;
  }
}



