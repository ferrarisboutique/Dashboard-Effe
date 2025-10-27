// Sentry configuration (optional - only if DSN is provided)
let sentryInitialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || sentryInitialized) return;

  try {
    // Dynamic import to avoid bundling Sentry if not needed
    import('@sentry/react').then(({ init, captureException }) => {
      init({
        dsn,
        environment: import.meta.env.MODE,
        beforeSend(event) {
          // Filter out development errors
          if (import.meta.env.MODE === 'development') {
            return null;
          }
          return event;
        },
      });
      sentryInitialized = true;
    });
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (!sentryInitialized) {
    console.error('Error (Sentry not initialized):', error, context);
    return;
  }

  try {
    import('@sentry/react').then(({ captureException }) => {
      captureException(error, { extra: context });
    });
  } catch (err) {
    console.error('Failed to capture error:', err);
  }
}

