import * as Sentry from '@sentry/nextjs';

// Next.js calls register() once per runtime at boot. We dispatch to the right
// Sentry config for whichever runtime we're in — Node for server components /
// server actions / route handlers, Edge for middleware.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Server Component / route-handler request errors. Without this hook, errors
// thrown inside Server Components are caught by Next's boundary and never
// surface to Sentry.
export const onRequestError = Sentry.captureRequestError;
