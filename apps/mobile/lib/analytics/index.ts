type PostHogLike = {
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  screen: (name: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

let posthog: PostHogLike | null = null;
let initialized = false;

export async function initAnalytics() {
  if (initialized) return;
  initialized = true;

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  // Allow builds without analytics configured.
  if (!key) return;

  // You can enable analytics in dev later if you want.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] disabled in development');
    return;
  }

  // Optional dependency: if the package isn't installed, analytics becomes a no-op.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PostHog = require('posthog-react-native')?.default ?? require('posthog-react-native');
    if (!PostHog) return;
    posthog = new PostHog(key, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[analytics] posthog-react-native not installed; analytics disabled');
  }
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  posthog?.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, properties);
    return;
  }
  posthog?.capture(event, properties);
}

export function screen(name: string, properties?: Record<string, unknown>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] screen', name, properties);
    return;
  }
  posthog?.screen(name, properties);
}

export function reset() {
  posthog?.reset();
}



