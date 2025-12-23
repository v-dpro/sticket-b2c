import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiClient } from '../api/client';
import { useNotificationStore } from '../../stores/notificationStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // eslint-disable-next-line no-console
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // eslint-disable-next-line no-console
    console.log('Push notification permission denied');
    return null;
  }

  try {
    const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? process.env.EXPO_PROJECT_ID;
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });
    }

    return token;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get push token:', error);
    return null;
  }
}

export async function savePushToken(token: string): Promise<void> {
  try {
    await apiClient.post('/notifications/push-token', { token });
    useNotificationStore.getState().setExpoPushToken(token);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save push token:', error);
  }
}

export async function removePushToken(): Promise<void> {
  try {
    const token = useNotificationStore.getState().expoPushToken;
    if (token) {
      await apiClient.delete('/notifications/push-token', { data: { token } });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove push token:', error);
  }
}



