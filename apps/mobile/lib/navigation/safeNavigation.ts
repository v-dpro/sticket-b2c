import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Safely navigate back. If there's no history to go back to,
 * it will navigate to the fallback route instead.
 */
export function useSafeBack(fallbackRoute: string = '/(tabs)/discover') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  }, [router, fallbackRoute]);
}

/**
 * Legacy hook name for backward compatibility
 * @deprecated Use useSafeBack instead
 */
export function useSafeNavigation(fallbackRoute: string = '/(tabs)/discover') {
  return useSafeBack(fallbackRoute);
}

/**
 * Simple utility function to safely go back with a fallback route.
 * Use this when you can't use the hook.
 * 
 * Note: This version can't check canGoBack() synchronously, so it
 * tries router.back() and uses a fallback. For better reliability,
 * use the useSafeNavigation hook instead.
 */
export function safeBack(
  router: ReturnType<typeof useRouter>,
  fallbackRoute: string = '/(tabs)/feed'
) {
  // Try to go back
  router.back();
  
  // Fallback: if back() doesn't work, navigate to fallback
  // This is a workaround when we can't check canGoBack()
  setTimeout(() => {
    router.replace(fallbackRoute as any);
  }, 100);
}

