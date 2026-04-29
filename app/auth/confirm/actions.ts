'use server';

import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { REAUTH_COOKIE, REAUTH_WINDOW_SECONDS, issueReauthToken } from '@/lib/auth-cookies';
import {
  PENDING_NEXT_COOKIE,
  PENDING_REAUTH_COOKIE,
} from '@/lib/auth-pending-cookies';
import {
  SESSION_TTL_COOKIE,
  isMobileUserAgent,
  SESSION_TTL_30D_SECONDS,
  SESSION_TTL_12H_SECONDS,
} from '@/lib/session-persistence';
import {
  FRESH_SIGNIN_COOKIE,
  FRESH_SIGNIN_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE,
} from '@/lib/referral';
import { provisionPostAuth } from '@/lib/auth-provision';
import { safeNext } from '@/lib/safe-next';

const TOKEN_HASH_PATTERN = /^[A-Za-z0-9._~+/=-]{16,512}$/;
// "signup" fires for first-time sign-ins (Confirm signup template);
// "magiclink" for returning + reauth (Magic Link template);
// "email" reserved for the email-change template if we ever wire it.
const SUPPORTED_TYPES = new Set(['magiclink', 'signup', 'email']);

export type ConfirmResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function confirmAuthAction(formData: FormData): Promise<ConfirmResult> {
  const tokenHash = formData.get('token_hash');
  const type = formData.get('type');
  const remember = formData.get('remember') === '1';

  if (typeof tokenHash !== 'string' || !TOKEN_HASH_PATTERN.test(tokenHash)) {
    return { ok: false, error: 'This link is malformed. Request a new one to sign in.' };
  }
  if (typeof type !== 'string' || !SUPPORTED_TYPES.has(type)) {
    return { ok: false, error: 'This link type isn’t supported. Request a new one to sign in.' };
  }

  const supabase = await createClient();
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as 'magiclink' | 'signup' | 'email',
  });

  if (verifyError || !verifyData?.session?.user) {
    return {
      ok: false,
      error: 'This link has expired or already been used. Request a new one to sign in.',
    };
  }

  const userId = verifyData.session.user.id;
  const userEmail = verifyData.session.user.email;
  if (!userEmail) {
    await supabase.auth.signOut();
    return { ok: false, error: 'This link is missing an email — please request a new one.' };
  }

  const cookieStore = await cookies();
  const h = await headers();
  const ua = h.get('user-agent');
  const fwd = h.get('x-forwarded-for');
  const clientIp = fwd ? fwd.split(',')[0].trim() : h.get('x-real-ip');

  // Reauth path — short-circuit before user provisioning. Cookie was set by
  // /app/_actions/reauth.ts at the time the link was requested.
  const pendingReauth = cookieStore.get(PENDING_REAUTH_COOKIE)?.value ?? null;
  const pendingNext = cookieStore.get(PENDING_NEXT_COOKIE)?.value ?? null;
  const isReauthFlow = pendingReauth === userId;

  // Resolve the session TTL window. Mobile auto-persists 30d; tablet/desktop
  // honor the user's checkbox choice from the click-through page.
  const ttl = isMobileUserAgent(ua) || remember
    ? SESSION_TTL_30D_SECONDS
    : SESSION_TTL_12H_SECONDS;

  cookieStore.set({
    name: SESSION_TTL_COOKIE,
    value: String(ttl),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ttl,
  });
  cookieStore.set({
    name: FRESH_SIGNIN_COOKIE,
    value: '1',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: FRESH_SIGNIN_COOKIE_MAX_AGE_SECONDS,
  });
  cookieStore.delete(PENDING_REAUTH_COOKIE);
  cookieStore.delete(PENDING_NEXT_COOKIE);

  const safePendingNext = safeNext(pendingNext);

  if (isReauthFlow) {
    cookieStore.set({
      name: REAUTH_COOKIE,
      value: issueReauthToken(userId),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: REAUTH_WINDOW_SECONDS,
    });
    return { ok: true, redirectTo: safePendingNext ?? '/app/home' };
  }

  // Regular sign-in / sign-up. Provision the public.users row if this is the
  // first time. Reserved emails get refused after sign-out.
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? null;
  const result = await provisionPostAuth({ userId, userEmail, clientIp, referralCode });

  if (!result.ok) {
    if (result.reason === 'reserved_email') {
      await supabase.auth.signOut();
      return { ok: false, error: 'This email isn’t allowed. Use a different address.' };
    }
    await supabase.auth.signOut();
    return { ok: false, error: 'We couldn’t set up your account. Please try again.' };
  }

  if (result.isNewUser) cookieStore.delete(REFERRAL_COOKIE);

  if (result.isNewUser) return { ok: true, redirectTo: '/onboarding/step-1' };
  return { ok: true, redirectTo: safePendingNext ?? '/app/home' };
}
