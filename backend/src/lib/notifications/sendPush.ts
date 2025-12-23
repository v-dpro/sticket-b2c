import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import prisma from '../prisma';

const expo = new Expo();

export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  if (!tokens.length) return;

  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }));

  if (!messages.length) return;

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending push notification:', error);
    }
  }
}



