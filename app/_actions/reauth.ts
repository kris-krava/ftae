'use server';

import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { safeNext } from '@/lib/safe-next';
import {
  PENDING_REAUTH_COOKIE,
  PENDING_NEXT_COOKIE,
  PENDING_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/auth-pending-cookies';

export type ReauthResult =
  | { ok: true; sentTo: string }
  | { ok: false; error: string };

export async function requestReauth(formData: FormData): Promise<ReauthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: 'Not signed in.' };

  const limit = await rateLimit(`reauth:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many requests. Please try again later.' };

  const next = safeNext(formData.get('next') as string | null) ?? '/app/home';

  // Build the callback URL using the current request's origin so dev/preview
  // hosts work without env-var coupling.
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host');
  if (!host) return { ok: false, error: 'Could not determine request origin.' };
  const origin = `${proto}://${host}`;

  // The magic-link email points at /auth/confirm — same template as regular
  // sign-in. We mark this confirmation as a reauth via short-lived cookies so
  // /auth/confirm can branch on flow context without relying on URL params
  // that would survive the email round-trip in plaintext.
  const cookieStore = await cookies();
  cookieStore.set({
    name: PENDING_REAUTH_COOKIE,
    value: user.id,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PENDING_COOKIE_MAX_AGE_SECONDS,
  });
  cookieStore.set({
    name: PENDING_NEXT_COOKIE,
    value: next,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PENDING_COOKIE_MAX_AGE_SECONDS,
  });

  const callbackParams = new URLSearchParams({ type: 'reauth', next });
  const redirectTo = `${origin}/auth/callback?${callbackParams.toString()}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });
  if (error) return { ok: false, error: 'Could not send confirmation link. Please try again.' };

  return { ok: true, sentTo: user.email };
}
