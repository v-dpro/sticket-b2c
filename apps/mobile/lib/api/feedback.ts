import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { apiClient } from './client';

export type FeedbackType = 'bug' | 'feature' | 'other';

export async function submitFeedback(input: {
  type: FeedbackType;
  message: string;
  userId?: string;
  email?: string;
  path?: string;
}) {
  const payload = {
    type: input.type,
    message: input.message,
    userId: input.userId,
    email: input.email,
    path: input.path,
    app: {
      version: Application.nativeApplicationVersion ?? undefined,
      build: Application.nativeBuildVersion ?? undefined,
      platform: Platform.OS,
      osVersion: Device.osVersion ?? undefined,
      deviceName: Device.deviceName ?? undefined,
      modelName: Device.modelName ?? undefined,
      isDevice: Device.isDevice,
    },
  };

  // Expecting backend to handle POST /feedback.
  await apiClient.post('/feedback', payload);
}



