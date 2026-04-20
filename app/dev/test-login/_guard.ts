import 'server-only';

// Module-load safety net: refuse to initialize dev-only behavior if the opt-in
// flag is set on a production server runtime. We specifically skip the build
// phase (phase-production-build) so `next build` with the flag in .env.local
// doesn't fail. Runtime gating still comes from middleware + assertDev +
// assertNotProdHost + notFound() at the page.
if (
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.NODE_ENV === 'production' &&
  process.env.FTAE_ENABLE_DEV_TOOLS === '1'
) {
  throw new Error('FTAE dev tools cannot run with NODE_ENV=production');
}

export const DEV_TOOLS_ENABLED: boolean =
  process.env.NODE_ENV !== 'production' &&
  process.env.FTAE_ENABLE_DEV_TOOLS === '1';

export function assertDev(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev-only code path reached under NODE_ENV=production');
  }
  if (process.env.FTAE_ENABLE_DEV_TOOLS !== '1') {
    throw new Error('FTAE_ENABLE_DEV_TOOLS must be "1" to use dev tools');
  }
}

// Extra belt-and-braces: block execution if the request host matches any
// deployed domain, regardless of env. A misconfigured NODE_ENV on a Vercel
// preview or branch deploy still cannot open this door.
const PROD_HOST_PATTERNS = [
  /(?:^|\.)freetradeartexchange\.com$/i,
  /\.vercel\.app$/i,
];

export function assertNotProdHost(host: string | null | undefined): void {
  if (!host) return; // CLI / server-to-server; env + runtime checks already gate
  const bare = host.split(':')[0].toLowerCase();
  for (const pattern of PROD_HOST_PATTERNS) {
    if (pattern.test(bare)) {
      throw new Error(`Dev-only route must not run on host ${bare}`);
    }
  }
}

export const TEST_EMAIL_DOMAIN = 'test.ftae.local';
export const TEST_DOMAIN_MATCH = /@test\.ftae\.local$/i;
