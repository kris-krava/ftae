'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { isReauthFresh, REAUTH_COOKIE } from '@/lib/auth-cookies';

const EmailSchema = z.string().trim().toLowerCase().email();

export type EditEmailResult =
  | { ok: true; pendingEmail: string }
  | { ok: false; error: string; needsReauth?: boolean };

export async function requestEmailChange(formData: FormData): Promise<EditEmailResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const reauthCookie = cookies().get(REAUTH_COOKIE)?.value;
  if (!isReauthFresh(reauthCookie, user.id)) {
    return {
      ok: false,
      error: 'Please confirm it’s you before changing your email.',
      needsReauth: true,
    };
  }

  const limit = rateLimit(`edit-email:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many requests. Please try again later.' };

  const parsed = EmailSchema.safeParse(formData.get('new_email'));
  if (!parsed.success) return { ok: false, error: 'Please enter a valid email address.' };

  const newEmail = parsed.data;
  if (newEmail === (user.email ?? '').toLowerCase()) {
    return { ok: false, error: 'That is already your current email.' };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return { ok: false, error: 'Could not start email change. Please try again.' };
  }
  return { ok: true, pendingEmail: newEmail };
}

// Sync auth.users.email → public.users.email after Supabase confirms a change.
export async function syncEmailFromAuth(): Promise<{ ok: boolean; email?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false };

  const { data: row } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();
  if (!row) return { ok: false };

  if ((row.email as string).toLowerCase() === user.email.toLowerCase()) {
    return { ok: true, email: user.email };
  }
  const { error } = await supabaseAdmin
    .from('users')
    .update({ email: user.email })
    .eq('id', user.id);
  if (error) {
    console.error('email sync failed:', error);
    return { ok: false };
  }
  return { ok: true, email: user.email };
}
