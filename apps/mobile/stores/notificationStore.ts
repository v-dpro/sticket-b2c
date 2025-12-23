import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  expoPushToken: string | null;

  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
  setExpoPushToken: (token: string) => void;
  hydrate: () => Promise<void>;
}

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  expoPushToken: null,

  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
  setExpoPushToken: (token) => {
    set({ expoPushToken: token });
    void AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
  },
  hydrate: async () => {
    const token = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
    set({ expoPushToken: token });
  },
}));



