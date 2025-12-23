import { useState } from 'react';
import { useRouter } from 'expo-router';

import { deleteAccount as deleteAccountApi, logout as logoutApi } from '../lib/api/settings';
import { useSessionStore } from '../stores/sessionStore';

export function useAccountActions() {
  const router = useRouter();
  const signOut = useSessionStore((s) => s.signOut);
  const resetLocalData = useSessionStore((s) => s.resetLocalData);

  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      try {
        await logoutApi();
      } catch (err) {
        // Continue even if API fails
        // eslint-disable-next-line no-console
        console.error('Logout API error:', err);
      }

      await signOut();
      router.replace('/(auth)/sign-in');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (password: string, reason?: string) => {
    setLoading(true);
    try {
      await deleteAccountApi(password, reason);

      // Clear everything local (db + session)
      await resetLocalData();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  return {
    loading,
    logout,
    deleteAccount,
  };
}



