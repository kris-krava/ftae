import 'server-only';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueUsername } from '@/lib/username';
import { isReservedEmail } from '@/lib/reserved-emails';
import { reportError } from '@/lib/observability';
import { REFERRAL_COOKIE } from '@/lib/referral';

// Title and body separated by \n — rendered split in the Notification Item.
// The trailing founding-member star is appended inline by the renderer when
// type === 'profile_nudge'; not a token in the text.
const PROFILE_NUDGE_MESSAGE =
  "Welcome to Free Trade Art Exchange!\nAdd your first piece of art to officially become a founding artist.";

export type ProvisionOutcome =
  | { ok: true; isNewUser: boolean }
  | { ok: false; reason: 'reserved_email' | 'user_create_failed' };

export interface ProvisionContext {
  userId: string;
  userEmail: string;
  /** "x-forwarded-for" / "x-real-ip" — used to log the signup IP. */
  clientIp: string | null;
  /** Value of the REFERRAL_COOKIE if set, used to attribute the signup. */
  referralCode: string | null;
}

/**
 * Idempotent post-auth provisioning: ensures a public.users row exists for
 * the freshly-authenticated user, logs the signup IP, drops a welcome
 * notification, and attributes the referral if one is pending. Returns
 * `isNewUser: true` only when this call created the row.
 *
 * Reserved internal/system emails are refused — caller is expected to sign
 * the session out and redirect to an error page.
 */
export async function provisionPostAuth(ctx: ProvisionContext): Promise<ProvisionOutcome> {
  const { userId, userEmail, clientIp, referralCode } = ctx;

  if (isReservedEmail(userEmail)) {
    const { data: existingTestRow } = await supabaseAdmin
      .from('users')
      .select('id, is_test_user')
      .eq('id', userId)
      .maybeSingle();
    // Allow seeded test users (is_test_user = true) through; block everything
    // else, including any anonymous session that just claimed the domain.
    if (!existingTestRow || existingTestRow.is_test_user !== true) {
      return { ok: false, reason: 'reserved_email' };
    }
    return { ok: true, isNewUser: false };
  }

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existingUser) return { ok: true, isNewUser: false };

  // First-time sign-in — provision the public.users row, log the IP, drop the
  // welcome notification, and attribute the referral if any. Founding-member
  // status and credit are deferred to first-art-add (which is when the user
  // hits 100% completion). They are not awarded for merely clicking a link.
  const seed = userEmail.split('@')[0] ?? 'artist';
  const newReferralCode = randomBytes(16).toString('hex');

  // Username generation is select-then-insert (TOCTOU). Two concurrent first-
  // time sign-ins from similar emails could pick the same candidate. Retry on
  // unique-violation a couple of times before giving up, regenerating the
  // candidate each loop so we don't busy-spin on the same collision.
  let insertUserError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const username = await generateUniqueUsername(seed);
    const { error } = await supabaseAdmin.from('users').insert({
      id: userId,
      email: userEmail,
      username,
      referral_code: newReferralCode,
      is_founding_member: false,
      profile_completion_pct: 0,
    });
    if (!error) {
      insertUserError = null;
      break;
    }
    insertUserError = error;
    if (error.code !== '23505') break; // not a uniqueness collision — bail
  }

  if (insertUserError) {
    reportError({
      area: 'auth-provision',
      op: 'user_insert',
      err: insertUserError,
      userId,
      extra: { code: insertUserError.code },
    });
    return { ok: false, reason: 'user_create_failed' };
  }

  if (referralCode) {
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (referrer && referrer.id !== userId) {
      const { error: refError } = await supabaseAdmin.from('referrals').insert({
        referrer_user_id: referrer.id,
        referred_user_id: userId,
        referral_code: referralCode,
        signup_completed_at: new Date().toISOString(),
      });
      if (refError) {
        reportError({
          area: 'auth-provision',
          op: 'referral_insert',
          err: refError,
          userId,
          extra: { referrer_id: referrer.id },
        });
      }
    }
  }

  if (clientIp) {
    const { error: ipError } = await supabaseAdmin.from('user_ips').insert({
      user_id: userId,
      ip_address: clientIp,
      event_type: 'signup',
    });
    if (ipError) {
      reportError({ area: 'auth-provision', op: 'user_ips_insert', err: ipError, userId });
    }
  }

  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type: 'profile_nudge',
    message: PROFILE_NUDGE_MESSAGE,
    is_read: false,
  });
  if (notifError) {
    reportError({ area: 'auth-provision', op: 'welcome_notification_insert', err: notifError, userId });
  }

  return { ok: true, isNewUser: true };
}

export { REFERRAL_COOKIE };
