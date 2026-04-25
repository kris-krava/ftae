import 'server-only';
import { Resend } from 'resend';

// Resend client for app-direct transactional emails (currently the
// username-change confirmation; Supabase Auth still owns sign-in / signup /
// email-change / reauth via SMTP). Same Resend account / API key as the SMTP
// provider — Resend keys aren't scoped per consumer.
//
// Mirrors the rate-limit.ts and admin.ts guard pattern: throws at boot in
// production if the key is missing (so a deploy fails fast on misconfig)
// and only warns in dev so local development without the env var still
// boots — sends will then fail at runtime.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'lib/resend.ts: RESEND_API_KEY must be set in production. Get the key from your Resend account (the same one Supabase SMTP uses).',
    );
  }
  console.warn(
    '[resend] RESEND_API_KEY not set — outbound transactional emails (e.g. username-change confirmation) will fail at runtime. Set it in .env.local to test locally.',
  );
}

export const resend: Resend | null = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const FROM_EMAIL = 'Free Trade Art Exchange <noreply@freetradeartexchange.com>';
export const HELP_EMAIL = 'help@freetradeartexchange.com';
