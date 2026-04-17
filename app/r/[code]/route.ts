import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE_SECONDS } from '@/lib/referral';

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const { origin } = new URL(request.url);
  const code = params.code?.trim();

  const home = NextResponse.redirect(`${origin}/`);

  if (!code || code.length > 64) return home;

  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer) return home;

  home.cookies.set({
    name: REFERRAL_COOKIE,
    value: code,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  });

  return home;
}
