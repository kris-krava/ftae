'use server';

import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { isReauthFresh, REAUTH_COOKIE } from '@/lib/auth-cookies';
import { isReservedUsername } from '@/lib/username-rules';
import { validateUsername } from '@/lib/username-validation';
import { USERNAME_COOLDOWN_MS } from '@/lib/username-cooldown';

export type EditUsernameResult =
  | { ok: true; sentTo: string; pendingUsername: string }
  | { ok: false; error: string; needsReauth?: boolean; cooldownUntil?: string };

const UsernameSchema = z.string().trim().toLowerCase().min(3).max(30);

export async function requestUsernameChange(formData: FormData): Promise<EditUsernameResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: 'Not signed in.' };

  const reauthCookie = cookies().get(REAUTH_COOKIE)?.value;
  if (!isReauthFresh(reauthCookie, user.id)) {
    return {
      ok: false,
      error: 'Please confirm it’s you before changing your username.',
      needsReauth: true,
    };
  }

  const limit = await rateLimit(`edit-username:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many requests. Please try again later.' };

  const parsed = UsernameSchema.safeParse(formData.get('new_username'));
  if (!parsed.success) return { ok: false, error: 'Please enter a valid username.' };

  const next = parsed.data;
  if (isReservedUsername(next)) return { ok: false, error: 'That username is reserved.' };
  const v = validateUsername(next);
  if (!v.ok) return { ok: false, error: v.reason };

  const { data: row } = await supabaseAdmin
    .from('users')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .single();
  if (!row) return { ok: false, error: 'Could not load profile.' };

  if (next === (row.username as string).toLowerCase()) {
    return { ok: false, error: 'That is already your current username.' };
  }

  if (row.username_changed_at) {
    const elapsed = Date.now() - new Date(row.username_changed_at as string).getTime();
    if (elapsed < USERNAME_COOLDOWN_MS) {
      const cooldownUntil = new Date(
        new Date(row.username_changed_at as string).getTime() + USERNAME_COOLDOWN_MS,
      ).toISOString();
      return { ok: false, error: 'Username is locked.', cooldownUntil };
    }
  }

  const { data: clash } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', next)
    .neq('id', user.id)
    .maybeSingle();
  if (clash) return { ok: false, error: 'That username is taken.' };

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host');
  if (!host) return { ok: false, error: 'Could not determine request origin.' };
  const origin = `${proto}://${host}`;

  const callbackParams = new URLSearchParams({
    type: 'username_change',
    pending_username: next,
  });
  const redirectTo = `${origin}/auth/callback?${callbackParams.toString()}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });
  if (error) return { ok: false, error: 'Could not send confirmation link. Please try again.' };

  return { ok: true, sentTo: user.email, pendingUsername: next };
}
