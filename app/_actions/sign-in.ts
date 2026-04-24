'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { isReservedEmail } from '@/lib/reserved-emails';
import { safeNext } from '@/lib/safe-next';

export type RequestMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(): string | null {
  const h = headers();
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
  const emailLimit = rateLimit(`signin-email:${email}`, 5, 60 * 60_000);
  if (!emailLimit.ok) {
    return { ok: false, error: 'Too many sign-in attempts for this email. Please try again later.' };
  }
  const ip = getClientIp();
  if (ip) {
    const ipLimit = rateLimit(`signin-ip:${ip}`, 20, 60 * 60_000);
    if (!ipLimit.ok) {
      return { ok: false, error: 'Too many sign-in attempts. Please try again later.' };
    }
  }

  const next = safeNext(formData.get('next') as string | null);
  const remember = formData.get('remember') === '1';

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host');
  if (!host) return { ok: false, error: 'Could not determine request origin.' };
  const origin = `${proto}://${host}`;

  const callbackParams = new URLSearchParams();
  if (next) callbackParams.set('next', next);
  if (remember) callbackParams.set('remember', '1');
  const callbackQs = callbackParams.toString();
  const callbackUrl = `${origin}/auth/callback` + (callbackQs ? `?${callbackQs}` : '');

  const supabase = createClient();
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
