let initialized = false;
let Sentry: any = null;

export function initSentry() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  // If DSN isn't set, don't initialize (keeps dev + CI happy).
  if (!dsn) return;

  // Optional dependency: if the package isn't installed, error tracking becomes a no-op.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require('sentry-expo');
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[sentry] sentry-expo not installed; error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: __DEV__,
    // Keep this conservative for beta; can be tuned later.
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  try {
    Sentry?.Native?.captureException?.(error, {
      extra: context,
    });
  } catch {
    // no-op
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  try {
    Sentry?.Native?.captureMessage?.(message, level);
  } catch {
    // no-op
  }
}

export function setUser(user: { id: string; email?: string; username?: string } | null) {
  try {
    Sentry?.Native?.setUser?.(
      user
        ? {
            id: user.id,
            email: user.email,
            username: user.username,
          }
        : null
    );
  } catch {
    // no-op
  }
}

export function addBreadcrumb(params: { message: string; category: string; data?: Record<string, unknown> }) {
  try {
    Sentry?.Native?.addBreadcrumb?.({
      message: params.message,
      category: params.category,
      data: params.data,
      level: 'info',
    });
  } catch {
    // no-op
  }
}



