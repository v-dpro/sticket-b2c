import { useCallback, useRef, useState } from 'react';

import { generateCardImage } from '../lib/share/generateCard';
import { copyLink, saveImageToLibrary, shareImage, shareToInstagramStory } from '../lib/share/shareUtils';
import { createEventLink, createLogLink, createUserLink } from '../lib/share/deepLinks';

export function useShare() {
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<any>(null);

  const captureCard = useCallback(async (): Promise<string | null> => {
    return generateCardImage(cardRef);
  }, []);

  const sharePng = useCallback(async (uri: string, message?: string) => {
    setSharing(true);
    try {
      return await shareImage(uri, message);
    } finally {
      setSharing(false);
    }
  }, []);

  const shareInstagram = useCallback(async (uri: string) => {
    setSharing(true);
    try {
      return await shareToInstagramStory(uri);
    } finally {
      setSharing(false);
    }
  }, []);

  const saveToGallery = useCallback(async (uri: string) => {
    setSharing(true);
    try {
      return await saveImageToLibrary(uri);
    } finally {
      setSharing(false);
    }
  }, []);

  const copy = useCallback(async (url: string) => {
    setSharing(true);
    try {
      await copyLink(url);
    } finally {
      setSharing(false);
    }
  }, []);

  return {
    cardRef,
    sharing,
    captureCard,
    sharePng,
    shareInstagram,
    saveToGallery,
    copy,
    createLogLink,
    createEventLink,
    createUserLink,
  };
}



