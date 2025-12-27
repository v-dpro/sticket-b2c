import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';

import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { initAnalytics, identify, reset as resetAnalytics } from '../lib/analytics';
import { initSentry, setUser as setSentryUser } from '../lib/errorTracking/sentry';
import { setupDeepLinkHandler } from '../lib/share/deepLinks';
import { useSession } from '../hooks/useSession';
import { colors } from '../lib/theme';

// Suppress navigation-related warnings and errors in development
// These are known issues when navigating from deep links or when there's no navigation history
// The warnings/errors are development-only and won't appear in production
// The NavigationContainer error (ExpoRoot.js:144) is the internal source of the GO_BACK warning

// Suppress LogBox warnings
LogBox.ignoreLogs([
  "The action 'GO_BACK' was not handled by any navigator",
  "Is there any screen to go back to?",
  /The action 'GO_BACK' was not handled/,
  /NavigationContainer.*GO_BACK/,
  /onUnhandledAction.*GO_BACK/,
]);

// Intercept console errors/warnings for GO_BACK navigation errors (development only)
// This catches errors that LogBox might not catch (like console.error/console.warn calls from NavigationContainer)
// NOTE: This only suppresses console output - it does NOT prevent navigation
if (__DEV__) {
  const shouldSuppress = (args: any[]): boolean => {
    return args.some((arg) => {
      if (typeof arg === 'string') {
        return (
          arg.includes("The action 'GO_BACK' was not handled") ||
          arg.includes("Is there any screen to go back to?") ||
          (arg.includes('GO_BACK') && arg.includes('navigator'))
        );
      }
      if (arg && typeof arg === 'object') {
        const message = (arg as any).message || (arg as any).toString?.() || '';
        return typeof message === 'string' && message.includes('GO_BACK');
      }
      return false;
    });
  };

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    originalWarn.apply(console, args);
  };
}

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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

  // Hide splash screen once app is ready
  useEffect(() => {
    // Small delay to ensure everything is rendered
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to hide splash screen:', error);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});



