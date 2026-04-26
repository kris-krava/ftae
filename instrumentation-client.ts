import * as Sentry from '@sentry/nextjs';
import { scrubPii } from '@/lib/sentry-scrub';

// Browser-side error tracking. Lives at the project root as
// `instrumentation-client.ts` (not `sentry.client.config.ts`) for Turbopack
// compatibility — the older filename is a no-op under Turbopack, which Next
// 16 uses for both dev and prod builds.
//
// Initializes only when NEXT_PUBLIC_SENTRY_DSN is present so local dev
// without a Sentry project still runs cleanly.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Light performance sampling — free tier covers 10k/month and we don't
    // need finer granularity until traffic justifies it.
    tracesSampleRate: 0.1,
    // No Session Replay — saves ~70KB of client bundle. Privacy implication
    // for an artist platform with real artwork makes us want to be deliberate
    // before flipping these on.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Defense-in-depth: SDK default is already false, but pin it so a future
    // bump can't quietly start sending IPs/cookies/etc.
    sendDefaultPii: false,
    beforeSend: scrubPii,
  });
}

// Required by Sentry to instrument client-side navigations (App Router
// route changes). Without this export, Sentry warns at build time and
// trace data for navigation transitions is missing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
