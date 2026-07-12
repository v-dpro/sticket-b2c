import { useCallback, useEffect, useState } from 'react';

import {
  getVenueQuestions,
  submitQuestionAnswer,
  submitVenueQuestion,
  toggleAnswerUpvote,
} from '../lib/api/venues';
import { haptics } from '../lib/motion';
import type { VenueQuestion } from '../types/venue';

/** VENUE Q&A — question list + answer/upvote handlers for a single venue. */
export function useVenueQuestions(venueId: string) {
  const [questions, setQuestions] = useState<VenueQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVenueQuestions(venueId);
      setQuestions(data.questions ?? []);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load venue questions:', err);
      setError(err?.response?.data?.error || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const askQuestion = async (text: string): Promise<boolean> => {
    try {
      const question = await submitVenueQuestion(venueId, text);
      setQuestions((prev) => [
        { ...question, answers: question.answers ?? [], answerCount: question.answerCount ?? 0 },
        ...prev,
      ]);
      haptics.medium();
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to post question:', err);
      haptics.error();
      return false;
    }
  };

  const answerQuestion = async (questionId: string, text: string): Promise<boolean> => {
    try {
      const answer = await submitQuestionAnswer(questionId, text);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, answers: [...q.answers, answer], answerCount: q.answerCount + 1 } : q
        )
      );
      haptics.medium();
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to post answer:', err);
      haptics.error();
      return false;
    }
  };

  const toggleUpvote = async (questionId: string, answerId: string) => {
    const question = questions.find((q) => q.id === questionId);
    const answer = question?.answers.find((a) => a.id === answerId);
    if (!answer) return;

    const prevUpvoted = answer.yourUpvote;
    const prevCount = answer.upvotes;

    const applyAnswer = (upvoted: boolean, upvotes: number) =>
      setQuestions((prev) =>
        prev.map((q) =>
          q.id !== questionId
            ? q
            : {
                ...q,
                answers: q.answers.map((a) => (a.id === answerId ? { ...a, yourUpvote: upvoted, upvotes } : a)),
              }
        )
      );

    // Optimistic toggle.
    applyAnswer(!prevUpvoted, prevCount + (prevUpvoted ? -1 : 1));

    try {
      const result = await toggleAnswerUpvote(answerId);
      applyAnswer(result.upvoted, result.upvotes);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to toggle answer upvote:', err);
      applyAnswer(prevUpvoted, prevCount);
      haptics.error();
    }
  };

  return {
    questions,
    loading,
    error,
    refresh: fetchQuestions,
    askQuestion,
    answerQuestion,
    toggleUpvote,
  };
}
