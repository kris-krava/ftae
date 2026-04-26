'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/observability';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import {
  issueEmailChangeToken,
  EMAIL_CHANGE_TOKEN_TTL_SECONDS,
} from '@/lib/email-change-token';
import {
  CONFIRM_EMAIL_CHANGE_OLD_SUBJECT,
  CONFIRM_EMAIL_CHANGE_NEW_SUBJECT,
  renderConfirmEmailChangeOldHtml,
  renderConfirmEmailChangeNewHtml,
} from '@/lib/email-templates/confirm-email-change';

const EmailSchema = z.string().trim().toLowerCase().email();

export type EditEmailResult =
  | { ok: true; pendingEmail: string }
  | { ok: false; error: string };

// Custom email-change flow that bypasses Supabase Auth entirely. Why:
// Supabase's "Secure email change" flow ignored emailRedirectTo on partial
// confirmations and routed users to the project Site URL with a hash-fragment
// message we couldn't intercept server-side, leaving the user stranded on
// /app/home with #message=...&sb= in the URL and no way to reach our
// /pending or /done screens.
//
// Now: the action records a pending_email_changes row and sends two custom
// Resend emails — one to the current address, one to the new address. Each
// has a distinct HMAC-signed token. The /auth/confirm-email-change/{old,new}
// routes mark each side confirmed and, when both are done, apply the change
// via supabaseAdmin.auth.admin.updateUserById and update public.users.
export async function requestEmailChange(formData: FormData): Promise<EditEmailResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: 'Not signed in.' };

  const limit = await rateLimit(`edit-email:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many requests. Please try again later.' };

  const parsed = EmailSchema.safeParse(formData.get('new_email'));
  if (!parsed.success) return { ok: false, error: 'Please enter a valid email address.' };

  const newEmail = parsed.data;
  const currentEmail = user.email.toLowerCase();
  if (newEmail === currentEmail) {
    return { ok: false, error: 'That is already your current email.' };
  }

  // Block addresses already in use by another account before sending a
  // confirmation that would 409 at apply time.
  const { data: clash } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', newEmail)
    .neq('id', user.id)
    .maybeSingle();
  if (clash) {
    return { ok: false, error: 'That email is already in use by another account.' };
  }

  const resend = getResend();
  if (!resend) {
    reportError({
      area: 'edit-email',
      op: 'resend_unavailable',
      err: new Error('Resend client unavailable — RESEND_API_KEY missing'),
      userId: user.id,
    });
    return { ok: false, error: 'Email service is unavailable. Please try again later.' };
  }

  // Replace any prior in-flight change for this user — submitting a new
  // request invalidates the previous one (its tokens still verify but its
  // pending row is gone, so the route handler will redirect to /edit-email
  // with ?error=expired on a stale click).
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_SECONDS * 1000).toISOString();
  const { error: upsertErr } = await supabaseAdmin
    .from('pending_email_changes')
    .upsert(
      {
        user_id: user.id,
        new_email: newEmail,
        old_confirmed_at: null,
        new_confirmed_at: null,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id' },
    );
  if (upsertErr) {
    reportError({
      area: 'edit-email',
      op: 'upsert_pending',
      err: upsertErr,
      userId: user.id,
      extra: { code: upsertErr.code },
    });
    return { ok: false, error: 'Could not start email change. Please try again.' };
  }

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host');
  if (!host) return { ok: false, error: 'Could not determine request origin.' };
  const origin = `${proto}://${host}`;

  const oldToken = issueEmailChangeToken(user.id, 'old');
  const newToken = issueEmailChangeToken(user.id, 'new');
  const oldUrl = `${origin}/auth/confirm-email-change/old?token=${encodeURIComponent(oldToken)}`;
  const newUrl = `${origin}/auth/confirm-email-change/new?token=${encodeURIComponent(newToken)}`;

  const [oldRes, newRes] = await Promise.all([
    resend.emails.send({
      from: FROM_EMAIL,
      to: currentEmail,
      subject: CONFIRM_EMAIL_CHANGE_OLD_SUBJECT,
      html: renderConfirmEmailChangeOldHtml({ currentEmail, newEmail, confirmUrl: oldUrl }),
    }),
    resend.emails.send({
      from: FROM_EMAIL,
      to: newEmail,
      subject: CONFIRM_EMAIL_CHANGE_NEW_SUBJECT,
      html: renderConfirmEmailChangeNewHtml({ currentEmail, newEmail, confirmUrl: newUrl }),
    }),
  ]);

  if (oldRes.error || newRes.error) {
    reportError({
      area: 'edit-email',
      op: 'resend_send',
      err: oldRes.error ?? newRes.error,
      userId: user.id,
      extra: {
        oldErr: oldRes.error?.message,
        newErr: newRes.error?.message,
      },
    });
    // Roll back the pending row so the user can retry without the rate
    // limit on the next attempt being misleading.
    await supabaseAdmin.from('pending_email_changes').delete().eq('user_id', user.id);
    return { ok: false, error: 'Could not send confirmation links. Please try again.' };
  }

  return { ok: true, pendingEmail: newEmail };
}

// Sync auth.users.email → public.users.email after the change applies. Kept
// as a defensive no-op for the /done page in case the route handler's
// best-effort public.users update failed silently.
export async function syncEmailFromAuth(): Promise<{ ok: boolean; email?: string }> {
  const supabase = await createClient();
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
    reportError({
      area: 'edit-email',
      op: 'sync_from_auth',
      err: error,
      userId: user.id,
    });
    return { ok: false };
  }
  return { ok: true, email: user.email };
}
