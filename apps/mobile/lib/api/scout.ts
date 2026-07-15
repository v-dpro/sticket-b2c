// GET /users/me/scout — raw contribution counts behind the SCOUT ladder
// (tips, seat views, Q&A answers + the upvotes they earned). Rank math is
// pure and lives in lib/gamification.ts (scoutRank).

import type { ScoutCounts } from '../gamification';
import { apiClient } from './client';

export async function getMyScout(): Promise<ScoutCounts> {
  const response = await apiClient.get('/users/me/scout');
  const d = response.data ?? {};
  return {
    tips: Number(d.tips) || 0,
    tipUpvotesReceived: Number(d.tipUpvotesReceived) || 0,
    seatViews: Number(d.seatViews) || 0,
    answers: Number(d.answers) || 0,
    answerUpvotesReceived: Number(d.answerUpvotesReceived) || 0,
  };
}
