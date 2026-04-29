import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  FRESH_SIGNIN_COOKIE,
  FRESH_SIGNIN_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE,
} from '@/lib/referral';
import {
  SESSION_TTL_COOKIE,
  resolveSessionTtl,
} from '@/lib/session-persistence';
import { issueReauthToken, REAUTH_COOKIE, REAUTH_WINDOW_SECONDS } from '@/lib/auth-cookies';
import { safeNext } from '@/lib/safe-next';
import { provisionPostAuth } from '@/lib/auth-provision';

const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

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
  // Signal a fresh sign-in to chromed clients so CTA dismiss flags reset.
  response.cookies.set({
    name: FRESH_SIGNIN_COOKIE,
    value: '1',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: FRESH_SIGNIN_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

// Legacy callback. As of the /auth/confirm rollout, the Supabase email
// template directs users at /auth/confirm instead of here. This route still
// runs for any old-template magic links left in inboxes within the 1-hour
// validity window, so it's preserved for grace-period compatibility.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const callbackType = searchParams.get('type');
  const isReauth = callbackType === 'reauth';
  const next = safeNext(searchParams.get('next'));
  const remember = searchParams.get('remember');

  if (!code || !CODE_PATTERN.test(code)) {
    return NextResponse.redirect(`${origin}/?error=invalid_code`);
  }

  const supabase = await createClient();
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

  const ttl = resolveSessionTtl(request.headers.get('user-agent'), remember);

  const referralCode = request.cookies.get(REFERRAL_COOKIE)?.value ?? null;
  const result = await provisionPostAuth({
    userId,
    userEmail,
    clientIp: getClientIp(request),
    referralCode,
  });

  if (!result.ok) {
    if (result.reason === 'reserved_email') {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/?error=reserved_email`);
    }
    return NextResponse.redirect(`${origin}/?error=user_create_failed`);
  }

  if (isReauth && !result.isNewUser) {
    return buildResponse(origin, next ?? '/app/home', ttl, userId, false);
  }

  if (!result.isNewUser) {
    return buildResponse(origin, next ?? '/app/home', ttl, null, false);
  }

  return buildResponse(origin, '/onboarding/step-1', ttl, null, true);
}
