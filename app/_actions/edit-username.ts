'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { isReservedUsername } from '@/lib/username-rules';
import { validateUsername } from '@/lib/username-validation';
import { USERNAME_COOLDOWN_MS } from '@/lib/username-cooldown';
import { reportError } from '@/lib/observability';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { issueUsernameChangeToken } from '@/lib/username-change-token';
import {
  CONFIRM_USERNAME_CHANGE_SUBJECT,
  renderConfirmUsernameChangeHtml,
} from '@/lib/email-templates/confirm-username-change';

export type EditUsernameResult =
  | { ok: true; sentTo: string; pendingUsername: string }
  | { ok: false; error: string; cooldownUntil?: string };

const UsernameSchema = z.string().trim().toLowerCase().min(3).max(30);

// Identity verification is delivered via a custom Resend email rather than
// Supabase's signInWithOtp. signInWithOtp would fire Supabase's "Magic Link"
// template (copy reads "Welcome back / sign in") — exactly the wrong action
// label for a username change. Custom email lets us write copy that matches
// what the user is actually confirming.
//
// The link in the email points at /auth/confirm-username-change and carries
// an HMAC-signed, expiring token (lib/username-change-token.ts). The route
// re-validates state at click time so a concurrent rename or cooldown change
// still wins.
export async function requestUsernameChange(formData: FormData): Promise<EditUsernameResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: 'Not signed in.' };

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

  const resend = getResend();
  if (!resend) {
    reportError({
      area: 'edit-username',
      op: 'resend_unavailable',
      err: new Error('Resend client unavailable — RESEND_API_KEY missing'),
      userId: user.id,
    });
    return { ok: false, error: 'Email service is unavailable. Please try again later.' };
  }

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host');
  if (!host) return { ok: false, error: 'Could not determine request origin.' };
  const origin = `${proto}://${host}`;

  const token = issueUsernameChangeToken(user.id, next);
  const confirmUrl = `${origin}/auth/confirm-username-change?token=${encodeURIComponent(token)}`;

  const { error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: CONFIRM_USERNAME_CHANGE_SUBJECT,
    html: renderConfirmUsernameChangeHtml({ newUsername: next, confirmUrl }),
  });
  if (sendError) {
    reportError({
      area: 'edit-username',
      op: 'resend_send',
      err: sendError,
      userId: user.id,
      extra: { name: sendError.name, message: sendError.message },
    });
    return { ok: false, error: 'Could not send confirmation link. Please try again.' };
  }

  return { ok: true, sentTo: user.email, pendingUsername: next };
}
