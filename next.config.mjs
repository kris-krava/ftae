import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Dynamic routes (e.g. /[username]) change frequently — a user adds art,
    // follows someone, the scenario runner re-seeds with a new user id. The
    // default 30s client-side router cache masks those changes until it ages
    // out. Zero it so navigation always reflects current server state.
    staleTimes: { dynamic: 0 },
    // ArtForm allows up to 8 photos compressed to 2 MB each, plus form fields.
    // Default 1 MB rejects anything past one small photo. Direct-to-Storage
    // uploads via signed URL would remove this ceiling entirely — pending
    // refactor (bundle with save-art-to-trade work).
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    remotePatterns: [
      // Production Supabase project.
      {
        protocol: 'https',
        hostname: 'agwulzsczrrjyhyjhwgw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'agwulzsczrrjyhyjhwgw.supabase.co',
        pathname: '/storage/v1/render/image/public/**',
      },
      // Dev Supabase project — local development against the platform-dev
      // project's storage URLs.
      {
        protocol: 'https',
        hostname: 'spwrpridrbfscsdgoycy.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'spwrpridrbfscsdgoycy.supabase.co',
        pathname: '/storage/v1/render/image/public/**',
      },
      // picsum.photos is only referenced by /dev/test-login seeded data.
      // Harmless in prod — no real user profile ever points here because
      // the dev utility is 404'd on production deploys.
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
    ],
  },
};

// Wrap with Sentry — only uploads source maps when SENTRY_AUTH_TOKEN is set,
// which keeps local builds fast and silent. Org/project come from env so the
// repo doesn't hardcode the Sentry workspace.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Hide source maps from public bundle URLs — Sentry still gets them via the
  // upload step.
  hideSourceMaps: true,
  disableLogger: true,
  // Skip source-map upload entirely when no auth token (dev / CI without the
  // env var). Avoids noisy build output and broken `next build` runs.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Tunnel browser SDK requests through our domain to avoid ad-blocker
  // dropouts. Adds an /monitoring/* route handled by Sentry's middleware.
  tunnelRoute: '/monitoring',
  // Trim the browser bundle — we don't use Replay or Profiling, and don't
  // need the debug ID logger or the tracing extras. Keeps the landing page
  // close to its pre-Sentry First-Load JS size.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayCanvas: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
});
