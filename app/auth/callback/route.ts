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
import { isReservedUsername } from '@/lib/username-rules';
import { validateUsername } from '@/lib/username-validation';

const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;
// Title and body separated by \n — rendered split in the Notification Item.
const PROFILE_NUDGE_MESSAGE =
  "Your profile is looking good\nAdd more work you’d love to trade.";

function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/auth/')) return null;
  if (raw.startsWith('/api/')) return null;
  if (raw.length > 512) return null;
  return raw;
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
  const isUsernameChange = callbackType === 'username_change';
  const pendingUsernameRaw = searchParams.get('pending_username');
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
    return buildResponse(origin, '/app/profile/edit-email/done', ttl, null, false);
  }

  if (existingUser && isUsernameChange && pendingUsernameRaw) {
    const candidate = pendingUsernameRaw.trim().toLowerCase();
    const v = validateUsername(candidate);
    if (!v.ok || isReservedUsername(candidate)) {
      return buildResponse(origin, '/app/profile/edit-username?error=invalid', ttl, null, false);
    }
    const { data: clash } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', candidate)
      .neq('id', userId)
      .maybeSingle();
    if (clash) {
      return buildResponse(origin, '/app/profile/edit-username?error=taken', ttl, null, false);
    }
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ username: candidate, username_changed_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) {
      console.error('Username update failed:', updateError);
      return buildResponse(origin, '/app/profile/edit-username?error=save', ttl, null, false);
    }
    return buildResponse(origin, '/app/profile/edit-username/done', ttl, null, false);
  }

  if (existingUser) {
    return buildResponse(origin, next ?? '/app/home', ttl, null, false);
  }

  // First-time sign-in — provision the public.users row, log the IP, drop the
  // welcome notification, and consume the referral cookie. Founding-member
  // status and credit are deferred to first-art-add (which is when the user
  // hits 100% completion). They are not awarded for merely clicking a link.
  const seed = userEmail.split('@')[0] ?? 'artist';
  const username = await generateUniqueUsername(seed);
  const referralCode = randomBytes(16).toString('hex');

  const { error: insertUserError } = await supabaseAdmin.from('users').insert({
    id: userId,
    email: userEmail,
    username,
    referral_code: referralCode,
    is_founding_member: false,
    profile_completion_pct: 0,
  });

  if (insertUserError) {
    console.error('User insert failed:', insertUserError);
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
      if (refError) console.error('Referral insert failed:', refError);
    }
  }

  const ip = getClientIp(request);
  if (ip) {
    const { error: ipError } = await supabaseAdmin.from('user_ips').insert({
      user_id: userId,
      ip_address: ip,
      event_type: 'signup',
    });
    if (ipError) console.error('user_ips insert failed:', ipError);
  }

  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type: 'profile_nudge',
    message: PROFILE_NUDGE_MESSAGE,
    is_read: false,
  });
  if (notifError) console.error('Welcome notification insert failed:', notifError);

  return buildResponse(origin, '/onboarding/step-1', ttl, null, true);
}
