import { create } from 'zustand';

import type { LocalUser } from '../lib/local/users';
import { createUser, getUserById, upsertUserFromRemote, verifyUser } from '../lib/local/users';
import { initDb, resetDb } from '../lib/local/db';
import { seedIfEmpty } from '../lib/local/seed/seed';
import { ensureProfile, getProfile, type UserProfile } from '../lib/local/repo/profileRepo';
import { getLogCount } from '../lib/local/repo/logsRepo';
import { apiClient } from '../lib/api/client';
import * as SecureStore from '../lib/storage/secureStore';

const SESSION_KEY = 'sticket.currentUserId';

type SessionState = {
  isBootstrapped: boolean;
  isLoading: boolean;
  user: LocalUser | null;
  profile: UserProfile | null;
  hasLoggedFirstShow: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  resetLocalData: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  isBootstrapped: false,
  isLoading: false,
  user: null,
  profile: null,
  hasLoggedFirstShow: false,
  error: null,

  bootstrap: async () => {
    // Prevent concurrent bootstraps (can double-run SQLite seeding).
    if (get().isBootstrapped || get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      await initDb();
      await seedIfEmpty();
      const userId = await SecureStore.getItemAsync(SESSION_KEY);
      if (!userId) {
        set({ user: null, profile: null, hasLoggedFirstShow: false, isBootstrapped: true, isLoading: false });
        return;
      }

      const user = await getUserById(userId);
      if (!user) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        set({ user: null, profile: null, hasLoggedFirstShow: false, isBootstrapped: true, isLoading: false });
        return;
      }

      await ensureProfile(user.id);
      const profile = await getProfile(user.id);
      const logCount = await getLogCount(user.id);

      set({ user, profile, hasLoggedFirstShow: logCount > 0, isBootstrapped: true, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to bootstrap session',
        user: null,
        profile: null,
        hasLoggedFirstShow: false,
        isBootstrapped: true,
        isLoading: false,
      });
    }
  },

  signUp: async (email, password, usernameInput) => {
    set({ isLoading: true, error: null });
    try {
      // Prefer API-backed auth. Fall back to local-only if API isn't reachable.
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = (usernameInput ?? '')
          .trim()
          .toLowerCase()
          .replace(/\s/g, '')
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);

        const username =
          normalizedUsername ||
          (() => {
            const base = (normalizedEmail.split('@')[0] ?? 'user').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
            const suffix = Math.random().toString(36).slice(2, 6);
            return `${(base || 'user').slice(0, 12)}${suffix}`.slice(0, 20);
          })();

        const response = await apiClient.post('/auth/signup', { email: normalizedEmail, password, username });
        const data = response.data as { user: { id: string; email: string }; accessToken: string; refreshToken: string };

        await SecureStore.setItemAsync('access_token', data.accessToken);
        await SecureStore.setItemAsync('refresh_token', data.refreshToken);
        // legacy key for older call sites
        await SecureStore.setItemAsync('auth_token', data.accessToken);

        const localUser = await upsertUserFromRemote({ id: data.user.id, email: data.user.email });
        await SecureStore.setItemAsync(SESSION_KEY, localUser.id);
        const profile = await getProfile(localUser.id);
        set({ user: localUser, profile, hasLoggedFirstShow: false, isLoading: false });
        return;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[session] API signUp failed; falling back to local auth', e);
      }

      const localUser = await createUser(email, password);
      await SecureStore.setItemAsync(SESSION_KEY, localUser.id);
      const profile = await getProfile(localUser.id);
      set({ user: localUser, profile, hasLoggedFirstShow: false, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign up failed', isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Prefer API-backed auth. Fall back to local-only if API isn't reachable.
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const response = await apiClient.post('/auth/login', { email: normalizedEmail, password });
        const data = response.data as { user: { id: string; email: string }; accessToken: string; refreshToken: string };

        await SecureStore.setItemAsync('access_token', data.accessToken);
        await SecureStore.setItemAsync('refresh_token', data.refreshToken);
        // legacy key for older call sites
        await SecureStore.setItemAsync('auth_token', data.accessToken);

        const localUser = await upsertUserFromRemote({ id: data.user.id, email: data.user.email });
        await SecureStore.setItemAsync(SESSION_KEY, localUser.id);
        await ensureProfile(localUser.id);
        const profile = await getProfile(localUser.id);
        const logCount = await getLogCount(localUser.id);
        set({ user: localUser, profile, hasLoggedFirstShow: logCount > 0, isLoading: false });
        return;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[session] API signIn failed; falling back to local auth', e);
      }

      const localUser = await verifyUser(email, password);
      await SecureStore.setItemAsync(SESSION_KEY, localUser.id);
      await ensureProfile(localUser.id);
      const profile = await getProfile(localUser.id);
      const logCount = await getLogCount(localUser.id);
      set({ user: localUser, profile, hasLoggedFirstShow: logCount > 0, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign in failed', isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('auth_token');
      set({ user: null, profile: null, hasLoggedFirstShow: false, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign out failed', isLoading: false });
    }
  },

  refresh: async () => {
    const user = get().user;
    if (!user) return;
    set({ isLoading: true, error: null });
    try {
      await ensureProfile(user.id);
      const profile = await getProfile(user.id);
      const logCount = await getLogCount(user.id);
      set({ profile, hasLoggedFirstShow: logCount > 0, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Refresh failed', isLoading: false });
    }
  },

  resetLocalData: async () => {
    set({ isLoading: true, error: null });
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await resetDb();
      set({
        isBootstrapped: false,
        user: null,
        profile: null,
        hasLoggedFirstShow: false,
        error: null,
        isLoading: false,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Reset failed', isLoading: false });
    }
  },
}));




