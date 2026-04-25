import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyUsernameChangeToken } from '@/lib/username-change-token';
import { isReservedUsername } from '@/lib/username-rules';
import { validateUsername } from '@/lib/username-validation';
import { USERNAME_COOLDOWN_MS } from '@/lib/username-cooldown';
import { reportError } from '@/lib/observability';

// Confirmation endpoint for the username-change Resend email.
//
// Token format and signing live in lib/username-change-token.ts. We re-do the
// state checks here (auth, ownership, cooldown, format, reserved, taken)
// because the email could sit in a user's inbox for the full TTL — concurrent
// renames or other state changes might have happened since the request.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=invalid`);
  }

  const verified = verifyUsernameChangeToken(token);
  if (!verified) {
    // Bad signature, expired, or malformed — same redirect either way; we
    // don't want to leak which condition failed to a probing attacker.
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=expired`);
  }

  // Confirm the request originates from the same authenticated user the
  // token was issued for. Without this check, a stolen-link attacker who's
  // signed in to a different account could change THAT account's username.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/sign-in?next=/app/profile/edit-username`);
  }
  if (user.id !== verified.uid) {
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=invalid`);
  }

  const candidate = verified.username.trim().toLowerCase();

  // Re-validate format + reserved at confirm time — defense against a token
  // that was issued before a rule change tightened restrictions.
  const v = validateUsername(candidate);
  if (!v.ok || isReservedUsername(candidate)) {
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=invalid`);
  }

  const { data: row } = await supabaseAdmin
    .from('users')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .single();
  if (!row) {
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=save`);
  }

  // Idempotent success: if the username already matches the requested value
  // (e.g. user clicked the same link twice), treat as a successful no-op.
  if ((row.username as string).toLowerCase() === candidate) {
    return NextResponse.redirect(`${origin}/app/profile/edit-username/done`);
  }

  // Re-check cooldown — could have been triggered by another rename between
  // request issuance and click.
  if (row.username_changed_at) {
    const elapsed = Date.now() - new Date(row.username_changed_at as string).getTime();
    if (elapsed < USERNAME_COOLDOWN_MS) {
      return NextResponse.redirect(`${origin}/app/profile/edit-username?error=locked`);
    }
  }

  // Re-check uniqueness — someone else may have grabbed this username
  // between request and click.
  const { data: clash } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', candidate)
    .neq('id', user.id)
    .maybeSingle();
  if (clash) {
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=taken`);
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ username: candidate, username_changed_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) {
    reportError({
      area: 'confirm-username-change',
      op: 'username_update',
      err: updateError,
      userId: user.id,
      extra: { code: updateError.code, candidate },
    });
    return NextResponse.redirect(`${origin}/app/profile/edit-username?error=save`);
  }

  return NextResponse.redirect(`${origin}/app/profile/edit-username/done`);
}
