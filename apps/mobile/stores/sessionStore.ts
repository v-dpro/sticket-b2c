import { create } from 'zustand';

import { apiClient } from '../lib/api/client';
import { getMe } from '../lib/api/auth';
import { getErrorMessage } from '../lib/api/errorUtils';
import * as SecureStore from '../lib/storage/secureStore';

const SESSION_KEY = 'sticket.currentUserId';
const SESSION_CACHE_KEY = 'sticket.sessionCache';

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type UserProfile = {
  userId: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  onboardingCompleted: boolean;
  connectedMusic: boolean;
  createdAt: string;
  updatedAt: string;
};

type SessionSnapshot = {
  user: SessionUser;
  profile: UserProfile;
  hasLoggedFirstShow: boolean;
};

type SessionState = {
  isBootstrapped: boolean;
  isLoading: boolean;
  user: SessionUser | null;
  profile: UserProfile | null;
  hasLoggedFirstShow: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Hydrates the session from /auth/me using the stored tokens (used after social sign-in). */
  hydrateFromToken: () => Promise<void>;
  resetLocalData: () => Promise<void>;
};

type MePayload = {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  createdAt?: string;
  stats?: { shows?: number };
  hasSpotify?: boolean;
};

function toSnapshot(me: MePayload): SessionSnapshot {
  const createdAt = me.createdAt ?? new Date().toISOString();
  const shows = me.stats?.shows ?? 0;

  return {
    user: { id: me.id, email: me.email ?? '', createdAt },
    profile: {
      userId: me.id,
      displayName: me.displayName ?? null,
      username: me.username ?? null,
      bio: me.bio ?? null,
      avatarUrl: me.avatarUrl ?? null,
      city: me.city ?? null,
      // The API doesn't track onboarding state; having logged a show is the
      // strongest server-side signal (app/index.tsx also checks local flags).
      onboardingCompleted: shows > 0,
      connectedMusic: Boolean(me.hasSpotify),
      createdAt,
      updatedAt: new Date().toISOString(),
    },
    hasLoggedFirstShow: shows > 0,
  };
}

async function storeTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
  // legacy key for older call sites
  await SecureStore.setItemAsync('auth_token', accessToken);
}

async function persistSnapshot(snapshot: SessionSnapshot) {
  await SecureStore.setItemAsync(SESSION_KEY, snapshot.user.id);
  await SecureStore.setItemAsync(SESSION_CACHE_KEY, JSON.stringify(snapshot));
}

async function readCachedSnapshot(): Promise<SessionSnapshot | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function clearStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(SESSION_CACHE_KEY);
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  await SecureStore.deleteItemAsync('auth_token');
}

const signedOutState = {
  user: null,
  profile: null,
  hasLoggedFirstShow: false,
} as const;

export const useSessionStore = create<SessionState>((set, get) => ({
  isBootstrapped: false,
  isLoading: false,
  user: null,
  profile: null,
  hasLoggedFirstShow: false,
  error: null,

  bootstrap: async () => {
    // Prevent concurrent bootstraps.
    if (get().isBootstrapped || get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const token =
        (await SecureStore.getItemAsync('access_token')) ?? (await SecureStore.getItemAsync('auth_token'));
      if (!token) {
        set({ ...signedOutState, isBootstrapped: true, isLoading: false });
        return;
      }

      try {
        // Validate the stored token against the API (the client transparently
        // refreshes expired access tokens via /auth/refresh).
        const snapshot = toSnapshot((await getMe()) as MePayload);
        await persistSnapshot(snapshot);
        set({ ...snapshot, isBootstrapped: true, isLoading: false });
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          // Refresh was already attempted by the api client — the session is
          // no longer valid, so sign out.
          await clearStoredSession();
          set({ ...signedOutState, isBootstrapped: true, isLoading: false });
          return;
        }

        // Network/server failure: fall back to the last validated session so
        // the app still boots offline. Screens fetch from the API themselves
        // and surface their own error states.
        const cached = await readCachedSnapshot();
        if (cached) {
          set({ ...cached, isBootstrapped: true, isLoading: false });
          return;
        }

        set({ ...signedOutState, error: getErrorMessage(e), isBootstrapped: true, isLoading: false });
      }
    } catch (e) {
      set({
        ...signedOutState,
        error: e instanceof Error ? e.message : 'Failed to bootstrap session',
        isBootstrapped: true,
        isLoading: false,
      });
    }
  },

  signUp: async (email, password, usernameInput) => {
    set({ isLoading: true, error: null });
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
      const data = response.data as { user: MePayload; accessToken: string; refreshToken: string };

      await storeTokens(data.accessToken, data.refreshToken);

      const snapshot = toSnapshot(data.user);
      await persistSnapshot(snapshot);
      set({ ...snapshot, error: null, isLoading: false });
    } catch (e) {
      set({ error: getErrorMessage(e), isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiClient.post('/auth/login', { email: normalizedEmail, password });
      const data = response.data as { user: MePayload; accessToken: string; refreshToken: string };

      await storeTokens(data.accessToken, data.refreshToken);

      let snapshot: SessionSnapshot;
      try {
        // /auth/me carries stats (log count) the login payload doesn't.
        snapshot = toSnapshot((await getMe()) as MePayload);
      } catch {
        snapshot = toSnapshot(data.user);
      }

      await persistSnapshot(snapshot);
      set({ ...snapshot, error: null, isLoading: false });
    } catch (e) {
      set({ error: getErrorMessage(e), isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await clearStoredSession();
      set({ ...signedOutState, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Sign out failed', isLoading: false });
    }
  },

  refresh: async () => {
    if (!get().user) return;
    set({ isLoading: true, error: null });
    try {
      const snapshot = toSnapshot((await getMe()) as MePayload);
      await persistSnapshot(snapshot);
      set({ ...snapshot, isLoading: false });
    } catch (e) {
      // Keep the current session on failure — screens surface their own errors.
      set({ error: getErrorMessage(e), isLoading: false });
    }
  },

  hydrateFromToken: async () => {
    set({ isLoading: true, error: null });
    try {
      const snapshot = toSnapshot((await getMe()) as MePayload);
      await persistSnapshot(snapshot);
      set({ ...snapshot, error: null, isBootstrapped: true, isLoading: false });
    } catch (e) {
      set({ error: getErrorMessage(e), isLoading: false });
      throw e;
    }
  },

  resetLocalData: async () => {
    set({ isLoading: true, error: null });
    try {
      await clearStoredSession();
      set({
        isBootstrapped: false,
        ...signedOutState,
        error: null,
        isLoading: false,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Reset failed', isLoading: false });
    }
  },
}));
