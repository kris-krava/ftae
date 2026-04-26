import 'server-only';
import { Resend } from 'resend';

// Resend client for app-direct transactional emails (currently the
// username-change confirmation; Supabase Auth still owns sign-in / signup /
// email-change / reauth via SMTP). Same Resend account / API key as the SMTP
// provider — Resend keys aren't scoped per consumer.
//
// Lazy: prod misconfig still hard-fails, but on first send instead of at
// import. Next.js's build-time module evaluation imports this file during
// page-data collection even when no code path executes — a top-level throw
// would break `next build` whenever the key isn't in the local environment.

let _client: Resend | null | undefined;

export function getResend(): Resend | null {
  if (_client !== undefined) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'lib/resend.ts: RESEND_API_KEY must be set in production. Get the key from your Resend account (the same one Supabase SMTP uses).',
      );
    }
    console.warn(
      '[resend] RESEND_API_KEY not set — outbound transactional emails (e.g. username-change confirmation) will fail at runtime. Set it in .env.local to test locally.',
    );
    _client = null;
    return null;
  }
  _client = new Resend(key);
  return _client;
}

export const FROM_EMAIL = 'Free Trade Art Exchange <noreply@freetradeartexchange.com>';
export const HELP_EMAIL = 'help@freetradeartexchange.com';
