'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { safeNext } from '@/lib/safe-next';

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
