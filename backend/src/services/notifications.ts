import type { ExpoPushMessage } from 'expo-server-sdk';

import { sendPushNotification as sendExpoPush } from '../lib/notifications/sendPush';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Backwards-compatible service wrapper.
export async function sendPushNotification(userId: string, payload: PushPayload) {
  // Keep the payload type aligned with Expo.
  const _msg: Partial<ExpoPushMessage> = {
    title: payload.title,
    body: payload.body,
    data: payload.data,
  };

  return sendExpoPush(userId, payload);
}



