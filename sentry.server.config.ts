import * as Sentry from '@sentry/nextjs';

// Server-side (Node runtime) error tracking — server components, server
// actions, route handlers. No-op without SENTRY_DSN so local dev runs clean.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
