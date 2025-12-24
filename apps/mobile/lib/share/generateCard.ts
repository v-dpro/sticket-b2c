import type { RefObject } from 'react';

// TODO: Restore when dev client is rebuilt with react-native-view-shot
// import { captureRef } from 'react-native-view-shot';

// NOTE: RN host refs are tricky to type across versions; keep this permissive.
export async function generateCardImage(cardRef: RefObject<any>): Promise<string | null> {
  // Stubbed until dev client is rebuilt with native modules
  console.warn('generateCardImage: react-native-view-shot not available in this build');
  return null;
  
  /* Original implementation - uncomment after rebuilding dev client:
  try {
    if (!cardRef.current) return null;

    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    return uri;
  } catch (error) {
    console.error('Card generation error:', error);
    return null;
  }
  */
}



