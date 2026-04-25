import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyEmailChangeToken } from '@/lib/email-change-token';
import { reportError } from '@/lib/observability';

// Shared handler for both /auth/confirm-email-change/old and /new. Each
// route just delegates here with its expected side. We do the same
// security checks for both sides; the only behavioral difference is which
// timestamp column we touch on pending_email_changes.

interface PendingRow {
  user_id: string;
  new_email: string;
  old_confirmed_at: string | null;
  new_confirmed_at: string | null;
  expires_at: string;
}

export async function handleEmailChangeConfirm(
  request: NextRequest,
  expectedSide: 'old' | 'new',
): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=invalid`);
  }

  const verified = verifyEmailChangeToken(token);
  if (!verified) {
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=expired`);
  }
  // Defense against an attacker swapping the side query param to claim a
  // token meant for the other side. Side is encoded in the signed payload,
  // so a mismatch here means the URL was tampered with.
  if (verified.side !== expectedSide) {
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=invalid`);
  }

  // Require an active session that matches the user the token was issued
  // for. Without this, a stolen link clicked from a different account's
  // browser could confirm a side on someone else's pending change.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/sign-in?next=/app/profile/edit-email`);
  }
  if (user.id !== verified.uid) {
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=invalid`);
  }

  const { data: pending, error: fetchErr } = await supabaseAdmin
    .from('pending_email_changes')
    .select('user_id, new_email, old_confirmed_at, new_confirmed_at, expires_at')
    .eq('user_id', user.id)
    .maybeSingle<PendingRow>();

  if (fetchErr) {
    reportError({
      area: 'confirm-email-change',
      op: 'fetch_pending',
      err: fetchErr,
      userId: user.id,
    });
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=save`);
  }
  if (!pending) {
    // No pending change for this user — token belonged to a previous attempt
    // that's already been completed, cancelled, or replaced.
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=expired`);
  }
  if (new Date(pending.expires_at) < new Date()) {
    await supabaseAdmin.from('pending_email_changes').delete().eq('user_id', user.id);
    return NextResponse.redirect(`${origin}/app/profile/edit-email?error=expired`);
  }

  // Idempotent — keep the original confirmation timestamp on duplicate clicks.
  const updateField = expectedSide === 'old' ? 'old_confirmed_at' : 'new_confirmed_at';
  const alreadyConfirmed = expectedSide === 'old'
    ? pending.old_confirmed_at
    : pending.new_confirmed_at;
  const otherSideConfirmed = expectedSide === 'old'
    ? pending.new_confirmed_at
    : pending.old_confirmed_at;

  if (!alreadyConfirmed) {
    const { error: updErr } = await supabaseAdmin
      .from('pending_email_changes')
      .update({ [updateField]: new Date().toISOString() })
      .eq('user_id', user.id);
    if (updErr) {
      reportError({
        area: 'confirm-email-change',
        op: 'mark_side_confirmed',
        err: updErr,
        userId: user.id,
        extra: { side: expectedSide },
      });
      return NextResponse.redirect(`${origin}/app/profile/edit-email?error=save`);
    }
  }

  // If this click completed both sides, apply the change.
  if (otherSideConfirmed) {
    const newEmail = pending.new_email;

    // Defense against email already taken by another user since the
    // request was issued.
    const { data: clash } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .neq('id', user.id)
      .maybeSingle();
    if (clash) {
      await supabaseAdmin.from('pending_email_changes').delete().eq('user_id', user.id);
      return NextResponse.redirect(`${origin}/app/profile/edit-email?error=taken`);
    }

    // updateUserById with email_confirm:true sets the email and skips
    // Supabase's own confirmation flow (we just did our own dual confirm).
    const { error: applyErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    });
    if (applyErr) {
      reportError({
        area: 'confirm-email-change',
        op: 'apply_auth_email_update',
        err: applyErr,
        userId: user.id,
        extra: { newEmail },
      });
      return NextResponse.redirect(`${origin}/app/profile/edit-email?error=save`);
    }

    const { error: publicErr } = await supabaseAdmin
      .from('users')
      .update({ email: newEmail })
      .eq('id', user.id);
    if (publicErr) {
      reportError({
        area: 'confirm-email-change',
        op: 'apply_public_email_update',
        err: publicErr,
        userId: user.id,
      });
      // Best-effort — auth.users is the source of truth and is updated;
      // the next /done sync (or future logins) will reconcile public.users.
    }

    await supabaseAdmin.from('pending_email_changes').delete().eq('user_id', user.id);
    return NextResponse.redirect(`${origin}/app/profile/edit-email/done`);
  }

  return NextResponse.redirect(`${origin}/app/profile/edit-email/pending`);
}
