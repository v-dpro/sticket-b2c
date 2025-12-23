import { useState } from 'react';

import { addComment, deleteComment, markWasThere, removeWasThere } from '../lib/api/feed';
import type { FeedComment } from '../types/feed';

export function useFeedActions() {
  const [commenting, setCommenting] = useState(false);
  const [togglingWasThere, setTogglingWasThere] = useState(false);

  const submitComment = async (logId: string, text: string): Promise<FeedComment | null> => {
    setCommenting(true);
    try {
      const comment = await addComment(logId, text);
      return comment;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add comment:', err);
      return null;
    } finally {
      setCommenting(false);
    }
  };

  const removeComment = async (logId: string, commentId: string): Promise<boolean> => {
    try {
      await deleteComment(logId, commentId);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete comment:', err);
      return false;
    }
  };

  const toggleWasThere = async (logId: string, currentState: boolean): Promise<boolean> => {
    setTogglingWasThere(true);
    try {
      if (currentState) {
        await removeWasThere(logId);
      } else {
        await markWasThere(logId);
      }
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to toggle was there:', err);
      return false;
    } finally {
      setTogglingWasThere(false);
    }
  };

  return {
    commenting,
    togglingWasThere,
    submitComment,
    removeComment,
    toggleWasThere,
  };
}



