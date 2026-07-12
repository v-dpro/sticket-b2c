import 'react-native-gesture-handler';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';

import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { initAnalytics, identify, reset as resetAnalytics } from '../lib/analytics';
import { initSentry, setUser as setSentryUser } from '../lib/errorTracking/sentry';
import { setupDeepLinkHandler } from '../lib/share/deepLinks';
import { useSession } from '../hooks/useSession';
import { ThemeProvider, useTheme } from '../lib/theme-context';

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
        // Don't suppress API errors or other important errors
        if (typeof message === 'string' && (message.includes('[api]') || message.includes('request failed'))) {
          return false;
        }
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
  // ThemeProvider withholds children until the persisted theme mode is
  // hydrated (import-time AsyncStorage read), so RootShell — and therefore
  // the splash-hide effect — only runs with the correct palette. No
  // flash-of-wrong-theme.
  return (
    <ThemeProvider>
      <RootShell />
    </ThemeProvider>
  );
}

function RootShell() {
  usePushNotifications();
  const router = useRouter();
  const { user, profile, isLoading } = useSession();
  const { tokens, resolvedMode } = useTheme();

  // Font diet: the design system is system font + mono. Only the JetBrains
  // Mono weights load — fonts gate splash-hide, so this directly cuts cold
  // start (Instrument Serif / Inter / Space Grotesk had zero live usages).
  const [fontsLoaded] = useFonts({
    'JetBrainsMono': JetBrainsMono_400Regular,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'JetBrainsMono-Semi': JetBrainsMono_600SemiBold,
    'JetBrainsMono-Bold': JetBrainsMono_700Bold,
  });

  useEffect(() => {
    return setupDeepLinkHandler((path) => {
      router.push(path as any);
    });
  }, [router]);

  // Dev-only auto-login for simulator screenshot runs: only in __DEV__ bundles
  // started with EXPO_PUBLIC_DEV_AUTOLOGIN="email:password". Never in release.
  const autoLoginTried = useRef(false);
  useEffect(() => {
    const cred = __DEV__ ? process.env.EXPO_PUBLIC_DEV_AUTOLOGIN : undefined;
    if (!cred || user || isLoading || autoLoginTried.current) return;
    const idx = cred.indexOf(':');
    if (idx < 1) return;
    autoLoginTried.current = true;
    import('../stores/sessionStore').then(({ useSessionStore }) =>
      useSessionStore
        .getState()
        .signIn(cred.slice(0, idx), cred.slice(idx + 1))
        .then(() => router.replace('/(tabs)/home'))
        .catch(() => {}),
    );
  }, [user, isLoading, router]);

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

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, fontsLoaded]);

  return (
    // GestureHandlerRootView at the very root — GestureDetector surfaces
    // (memory deck, backfill swipe cards) die without it.
    <GestureHandlerRootView style={[styles.container, { backgroundColor: tokens.colors.bg }]}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            // Motion contract: navigation uses the native push (slide + swipe-
            // back). Fades are reserved for in-place view swaps, never routes.
            animation: 'default',
            contentStyle: { backgroundColor: tokens.colors.bg },
          }}
        >
          {/* Compose flows present as sheets, not pushes. */}
          <Stack.Screen name="log" options={{ presentation: 'modal' }} />
          <Stack.Screen name="wrapped/index" options={{ presentation: 'fullScreenModal' }} />
          {/* Floating memory viewer — transparent modal so the feed ghosts through.
              The card itself springs in; the fade here is only the backdrop. */}
          <Stack.Screen
            name="memory/[logId]"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});



