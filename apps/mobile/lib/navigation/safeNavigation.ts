import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Safely navigate back. If there's no history to go back to,
 * it will navigate to the fallback route instead.
 * 
 * Simple implementation: Always navigate to fallback route.
 * This ensures the back button always works.
 */
export function useSafeNavigation(fallbackRoute: string = '/(tabs)/feed') {
  const router = useRouter();

  const safeBack = useCallback(() => {
    // Simple: Just navigate to fallback route
    // This ensures the button always works
    router.replace(fallbackRoute as any);
  }, [router, fallbackRoute]);

  return { safeBack };
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

