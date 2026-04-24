import * as Sentry from '@sentry/nextjs';

// Browser-side error tracking. Initializes only when SENTRY_DSN is present so
// local dev without a Sentry project still runs cleanly.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Light performance sampling — free tier covers 10k/month and we don't
    // need finer granularity until traffic justifies it.
    tracesSampleRate: 0.1,
    // No Session Replay — saves ~70KB of client bundle and we can turn it on
    // later if a debugging gap appears.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
