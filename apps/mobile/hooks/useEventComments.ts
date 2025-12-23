import { useCallback, useEffect, useState } from 'react';

import { deleteEventComment, getEventComments, postEventComment } from '../lib/api/events';
import type { EventComment } from '../types/event';

export function useEventComments(eventId: string) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);

    try {
      const data = await getEventComments(eventId, { limit: 50 });
      setComments(data);
    } catch (err) {
      // Avoid redbox spam in dev for common "API offline" scenarios.
      // eslint-disable-next-line no-console
      console.warn('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const addComment = async (text: string) => {
    setPosting(true);
    try {
      const newComment = await postEventComment(eventId, text);
      setComments((prev) => [...prev, newComment]);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to post comment:', err);
      return false;
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    try {
      await deleteEventComment(eventId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete comment:', err);
      return false;
    }
  };

  return {
    comments,
    loading,
    posting,
    addComment,
    removeComment,
    refresh: fetchComments,
  };
}




