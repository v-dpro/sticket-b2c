import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { initAnalytics, identify, reset as resetAnalytics } from '../lib/analytics';
import { initSentry, setUser as setSentryUser } from '../lib/errorTracking/sentry';
import { setupDeepLinkHandler } from '../lib/share/deepLinks';
import { useSession } from '../hooks/useSession';

initSentry();
void initAnalytics();

export default function RootLayout() {
  usePushNotifications();
  const router = useRouter();
  const { user, profile } = useSession();

  useEffect(() => {
    return setupDeepLinkHandler((path) => {
      // Expo Router accepts a string route; we keep it simple here.
      router.push(path as any);
    });
  }, [router]);

  useEffect(() => {
    if (user) {
      const username = profile?.username ?? undefined;
      setSentryUser({ id: user.id, email: user.email, username });
      identify(user.id, { email: user.email, username });
    } else {
      setSentryUser(null);
      resetAnalytics();
    }
  }, [profile?.username, user]);

  return (
    <>
      <StatusBar style="light" />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </>
  );
}



