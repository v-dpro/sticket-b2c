// useSocialAuth — Apple / Google sign-in wiring shared by the auth screens.
//
// Exchanges the provider token with the API, stores the session tokens,
// then hydrates the session store (hydrateFromToken). Screens only render
// buttons and route on success.

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { apiClient } from '../lib/api/client';
import * as SecureStore from '../lib/storage/secureStore';
import { useSessionStore } from '../stores/sessionStore';

WebBrowser.maybeCompleteAuthSession();

type UseSocialAuthOptions = {
  /** Called after the session store is hydrated with a signed-in user. */
  onSuccess: () => void;
};

async function storeSessionTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
  await SecureStore.setItemAsync('auth_token', accessToken);
}

export function useSocialAuth({ onSuccess }: UseSocialAuthOptions) {
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    Platform.OS === 'ios'
      ? iosClientId && webClientId && iosClientId !== 'not-configured' && webClientId !== 'not-configured'
      : webClientId && webClientId !== 'not-configured'
  );

  // Hook must always run; placeholders keep it happy when unconfigured
  // (the button is hidden in that case).
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(
    Platform.OS === 'ios'
      ? {
          iosClientId: iosClientId || 'not-configured-placeholder',
          webClientId: webClientId || 'not-configured-placeholder',
        }
      : {
          webClientId: webClientId || 'not-configured-placeholder',
        }
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable).catch(() => setIsAppleAvailable(false));
    }
  }, []);

  const exchangeGoogleToken = useCallback(
    async (idToken: string | undefined) => {
      if (!idToken) return;
      setGoogleLoading(true);
      try {
        setError(null);
        const response = await apiClient.post('/auth/google/callback', { idToken });
        const { accessToken, refreshToken } = response.data;
        await storeSessionTokens(accessToken, refreshToken);
        await useSessionStore.getState().hydrateFromToken();
        onSuccess();
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Could not sign in with Google');
      } finally {
        setGoogleLoading(false);
      }
    },
    [onSuccess]
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      void exchangeGoogleToken(googleResponse.authentication?.idToken);
    }
  }, [exchangeGoogleToken, googleResponse]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios' || !isAppleAvailable) {
      setError('Apple Sign In is not available on this device');
      return;
    }
    setAppleLoading(true);
    try {
      setError(null);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token received');

      const response = await apiClient.post('/auth/apple/callback', {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        fullName: credential.fullName,
        email: credential.email,
      });
      const { accessToken, refreshToken } = response.data;
      await storeSessionTokens(accessToken, refreshToken);
      await useSessionStore.getState().hydrateFromToken();
      onSuccess();
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') return;
      setError(err?.response?.data?.error || err?.message || 'Could not sign in with Apple');
    } finally {
      setAppleLoading(false);
    }
  }, [isAppleAvailable, onSuccess]);

  const signInWithGoogle = useCallback(() => {
    if (!googleRequest || !isGoogleConfigured) {
      setError('Google Sign In is not configured');
      return;
    }
    void googlePromptAsync();
  }, [googlePromptAsync, googleRequest, isGoogleConfigured]);

  return {
    // Apple
    showAppleButton: Platform.OS === 'ios' && isAppleAvailable,
    appleLoading,
    signInWithApple,
    // Google
    showGoogleButton: isGoogleConfigured,
    googleLoading,
    signInWithGoogle,
    // Shared
    error,
    clearError: () => setError(null),
  };
}
