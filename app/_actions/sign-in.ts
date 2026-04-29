'use server';

import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { isReservedEmail } from '@/lib/reserved-emails';
import { safeNext } from '@/lib/safe-next';
import {
  PENDING_NEXT_COOKIE,
  PENDING_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/auth-pending-cookies';

export type RequestMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip');
}

export async function requestMagicLink(formData: FormData): Promise<RequestMagicLinkResult> {
  const emailRaw = formData.get('email');
  if (typeof emailRaw !== 'string') return { ok: false, error: 'Please enter a valid email address.' };
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (isReservedEmail(email)) {
    // Match the generic "could not send" wording so the response doesn't
    // confirm/deny domain reservation to a probing attacker.
    return { ok: false, error: 'Could not send magic link. Please try again.' };
  }

  // Two limits: per-email (protects an inbox from being spammed by one
  // attacker hitting many IPs) and per-IP (protects against one IP iterating
  // many emails). 5/hour matches the existing edit-username limit.
  const emailLimit = await rateLimit(`signin-email:${email}`, 5, 60 * 60_000);
  if (!emailLimit.ok) {
    return { ok: false, error: 'Too many sign-in attempts for this email. Please try again later.' };
  }
  const ip = await getClientIp();
  if (ip) {
    const ipLimit = await rateLimit(`signin-ip:${ip}`, 20, 60 * 60_000);
    if (!ipLimit.ok) {
      return { ok: false, error: 'Too many sign-in attempts. Please try again later.' };
    }
  }

  const next = safeNext(formData.get('next') as string | null);

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host');
  if (!host) return { ok: false, error: 'Could not determine request origin.' };
  const origin = `${proto}://${host}`;

  // The magic-link email points at /auth/confirm (Supabase template),
  // independent of `emailRedirectTo`. We use Supabase's own redirect for the
  // legacy /auth/callback fallback only, in case any old-template email is
  // still in an inbox. Deep-link `next` rides via a short-lived cookie so the
  // template URL stays simple.
  const cookieStore = await cookies();
  if (next) {
    cookieStore.set({
      name: PENDING_NEXT_COOKIE,
      value: next,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PENDING_COOKIE_MAX_AGE_SECONDS,
    });
  } else {
    cookieStore.delete(PENDING_NEXT_COOKIE);
  }

  const callbackUrl = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
      shouldCreateUser: true,
    },
  });
  if (error) {
    return { ok: false, error: 'Could not send magic link. Please try again.' };
  }

  return { ok: true };
}
