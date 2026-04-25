import { randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueUsername } from '@/lib/username';
import { REFERRAL_COOKIE } from '@/lib/referral';
import {
  SESSION_TTL_COOKIE,
  resolveSessionTtl,
} from '@/lib/session-persistence';
import { issueReauthToken, REAUTH_COOKIE, REAUTH_WINDOW_SECONDS } from '@/lib/auth-cookies';
import { isReservedEmail } from '@/lib/reserved-emails';
import { safeNext } from '@/lib/safe-next';
import { reportError } from '@/lib/observability';

const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;
// Title and body separated by \n — rendered split in the Notification Item.
const PROFILE_NUDGE_MESSAGE =
  "Your profile is looking good\nAdd more work you’d love to trade.";

function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

function buildResponse(
  origin: string,
  destination: string,
  ttl: number,
  reauthFor: string | null,
  clearReferral: boolean,
): NextResponse {
  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.set({
    name: SESSION_TTL_COOKIE,
    value: String(ttl),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ttl,
  });
  if (reauthFor) {
    response.cookies.set({
      name: REAUTH_COOKIE,
      value: issueReauthToken(reauthFor),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: REAUTH_WINDOW_SECONDS,
    });
  }
  if (clearReferral) response.cookies.delete(REFERRAL_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const callbackType = searchParams.get('type');
  const isEmailChange = callbackType === 'email_change' || callbackType === 'email';
  const isReauth = callbackType === 'reauth';
  const next = safeNext(searchParams.get('next'));
  const remember = searchParams.get('remember');

  if (!code || !CODE_PATTERN.test(code)) {
    return NextResponse.redirect(`${origin}/?error=invalid_code`);
  }

  const supabase = createClient();
  const { data: exchange, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !exchange?.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const userId = exchange.session.user.id;
  const userEmail = exchange.session.user.email;
  if (!userEmail) {
    return NextResponse.redirect(`${origin}/?error=missing_email`);
  }

  // Reserve internal/system email domains. If a real user managed to obtain a
  // session with one (e.g. existing rows from before this guard), refuse and
  // sign them back out — better than letting test-cleanup silently delete
  // their data later.
  if (isReservedEmail(userEmail)) {
    const { data: existingTestRow } = await supabaseAdmin
      .from('users')
      .select('id, is_test_user')
      .eq('id', userId)
      .maybeSingle();
    // Allow seeded test users (is_test_user = true) through; block everything
    // else, including any anonymous session that just claimed the domain.
    if (!existingTestRow || existingTestRow.is_test_user !== true) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/?error=reserved_email`);
    }
  }

  // Resolve and persist the session TTL preference. Read on every Supabase
  // cookie write (in middleware + lib/supabase/server.ts) to keep refresh-token
  // cookies aligned with the chosen window.
  const ttl = resolveSessionTtl(request.headers.get('user-agent'), remember);

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingUser && isReauth) {
    return buildResponse(origin, next ?? '/app/home', ttl, userId, false);
  }

  if (existingUser && isEmailChange) {
    // Supabase's "Secure email change" sends a confirmation to BOTH the old
    // and new addresses. Until BOTH are clicked, auth.users.email_change keeps
    // the pending new email; once both are clicked, Supabase rotates the
    // primary email and clears email_change. So the field's presence is the
    // signal for "still partway through".
    const { data: refreshed, error: refreshError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (refreshError) {
      reportError({
        area: 'auth-callback',
        op: 'email_change_status_check',
        err: refreshError,
        userId,
      });
      // Degraded path: assume the change is complete rather than stranding the
      // user on a confusing screen. The /done page will sync best-effort.
      return buildResponse(origin, '/app/profile/edit-email/done', ttl, null, false);
    }
    // `email_change` exists on auth.users at runtime but isn't surfaced on
    // Supabase's public User type, so we read it through an `unknown` cast.
    const refreshedUser = refreshed?.user as unknown as { email_change?: string | null } | null;
    const stillPending = Boolean(refreshedUser?.email_change);
    return buildResponse(
      origin,
      stillPending ? '/app/profile/edit-email/pending' : '/app/profile/edit-email/done',
      ttl,
      null,
      false,
    );
  }

  if (existingUser) {
    return buildResponse(origin, next ?? '/app/home', ttl, null, false);
  }

  // First-time sign-in — provision the public.users row, log the IP, drop the
  // welcome notification, and consume the referral cookie. Founding-member
  // status and credit are deferred to first-art-add (which is when the user
  // hits 100% completion). They are not awarded for merely clicking a link.
  const seed = userEmail.split('@')[0] ?? 'artist';
  const referralCode = randomBytes(16).toString('hex');

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
      referral_code: referralCode,
      is_founding_member: false,
      profile_completion_pct: 0,
    });
    if (!error) { insertUserError = null; break; }
    insertUserError = error;
    if (error.code !== '23505') break; // not a uniqueness collision — bail
  }

  if (insertUserError) {
    reportError({
      area: 'auth-callback',
      op: 'user_insert',
      err: insertUserError,
      userId,
      extra: { code: insertUserError.code },
    });
    return NextResponse.redirect(`${origin}/?error=user_create_failed`);
  }

  const refCookie = request.cookies.get(REFERRAL_COOKIE)?.value;
  if (refCookie) {
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', refCookie)
      .maybeSingle();
    if (referrer && referrer.id !== userId) {
      const { error: refError } = await supabaseAdmin.from('referrals').insert({
        referrer_user_id: referrer.id,
        referred_user_id: userId,
        referral_code: refCookie,
        signup_completed_at: new Date().toISOString(),
      });
      if (refError) {
        reportError({
          area: 'auth-callback',
          op: 'referral_insert',
          err: refError,
          userId,
          extra: { referrer_id: referrer.id },
        });
      }
    }
  }

  const ip = getClientIp(request);
  if (ip) {
    const { error: ipError } = await supabaseAdmin.from('user_ips').insert({
      user_id: userId,
      ip_address: ip,
      event_type: 'signup',
    });
    if (ipError) {
      reportError({
        area: 'auth-callback',
        op: 'user_ips_insert',
        err: ipError,
        userId,
      });
    }
  }

  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type: 'profile_nudge',
    message: PROFILE_NUDGE_MESSAGE,
    is_read: false,
  });
  if (notifError) {
    reportError({
      area: 'auth-callback',
      op: 'welcome_notification_insert',
      err: notifError,
      userId,
    });
  }

  return buildResponse(origin, '/onboarding/step-1', ttl, null, true);
}
