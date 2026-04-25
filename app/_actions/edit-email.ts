'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/observability';

const EmailSchema = z.string().trim().toLowerCase().email();

export type EditEmailResult =
  | { ok: true; pendingEmail: string }
  | { ok: false; error: string };

// Identity verification is delegated to Supabase's "Secure email change"
// behavior: the confirmation link is sent to BOTH the current and new
// addresses, and the change only completes when both are clicked. A
// session-hijacked actor would need access to the current inbox (which they
// don't) to complete the change.
export async function requestEmailChange(formData: FormData): Promise<EditEmailResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const limit = await rateLimit(`edit-email:${user.id}`, 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many requests. Please try again later.' };

  const parsed = EmailSchema.safeParse(formData.get('new_email'));
  if (!parsed.success) return { ok: false, error: 'Please enter a valid email address.' };

  const newEmail = parsed.data;
  if (newEmail === (user.email ?? '').toLowerCase()) {
    return { ok: false, error: 'That is already your current email.' };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    // Supabase Auth's per-address email rate limit (default 4/hour across all
    // email types). Distinct from our own per-user limit above — this fires
    // when the inbox itself has received too many recent transactional emails.
    const code = (error as { code?: string }).code;
    if (code === 'over_email_send_rate_limit') {
      return {
        ok: false,
        error: 'Too many email requests recently. Please try again in an hour.',
      };
    }
    reportError({
      area: 'edit-email',
      op: 'update_user',
      err: error,
      userId: user.id,
      extra: { code, status: (error as { status?: number }).status },
    });
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
