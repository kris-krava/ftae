import { randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueUsername } from '@/lib/username';
import { REFERRAL_COOKIE } from '@/lib/referral';

const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;
// Title and body separated by \n — rendered split in the Notification Item.
// Copy verified against Figma Page 2 notifications screen (frame 99:271).
const PROFILE_NUDGE_MESSAGE =
  "Your profile is looking good\nAdd more work you\u2019d love to trade.";

function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Supabase appends `type=email_change` (or `email`) when the magic link is from
  // auth.updateUser({ email }). Route those confirmations to the dedicated success
  // page instead of dropping the user on /app/following.
  const callbackType = searchParams.get('type');
  const isEmailChange = callbackType === 'email_change' || callbackType === 'email';

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

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingUser) {
    if (isEmailChange) {
      return NextResponse.redirect(`${origin}/app/profile/edit-email/done`);
    }
    return NextResponse.redirect(`${origin}/app/following`);
  }

  const seed = userEmail.split('@')[0] ?? 'artist';
  const username = await generateUniqueUsername(seed);
  const referralCode = randomBytes(16).toString('hex');

  const { data: openSetting } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', 'founding_member_enrollment_open')
    .maybeSingle();
  const isFoundingMember = openSetting?.value === 'true';

  const { error: insertUserError } = await supabaseAdmin.from('users').insert({
    id: userId,
    email: userEmail,
    username,
    referral_code: referralCode,
    is_founding_member: isFoundingMember,
    profile_completion_pct: 0,
  });

  if (insertUserError) {
    console.error('User insert failed:', insertUserError);
    return NextResponse.redirect(`${origin}/?error=user_create_failed`);
  }

  if (isFoundingMember) {
    const { count: existingFoundingCount } = await supabaseAdmin
      .from('membership_credits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('credit_type', 'founding_member');

    if (!existingFoundingCount) {
      const { error: creditError } = await supabaseAdmin.from('membership_credits').insert({
        user_id: userId,
        credit_type: 'founding_member',
        months_credited: 3,
        note: 'Founding member enrollment — automatic grant at signup',
      });
      if (creditError) {
        console.error('Founding-member credit insert failed:', creditError);
      }
    }
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

  const response = NextResponse.redirect(`${origin}/onboarding/step-1`);
  response.cookies.delete(REFERRAL_COOKIE);
  return response;
}
