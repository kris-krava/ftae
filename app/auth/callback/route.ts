import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type') ?? 'magiclink'

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  const cookieStore = cookies()

  // Exchange the auth code for a session using the SSR client so cookies are set
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  let session = null
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.session) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }
    session = data.session
  } else if (tokenHash) {
    // Token-hash flow used by admin-generated magic links (dev bypass)
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'email',
    })
    if (error || !data.session) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }
    session = data.session
  }

  if (!session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const userId = session.user.id
  const userEmail = session.user.email!

  // Check if a users row already exists for this auth uid
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    // Check whether founding member enrollment is open
    const { data: setting } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'founding_member_enrollment_open')
      .single()

    const isFoundingMember = setting?.value === 'true'

    // Generate a short unique referral code
    const referralCode = Math.random().toString(36).substring(2, 9).toUpperCase()

    // Insert the new user row (admin client bypasses RLS — no insert policy for users)
    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: userId,
      email: userEmail,
      is_founding_member: isFoundingMember,
      profile_completion_pct: 0,
      referral_code: referralCode,
    })

    if (insertError) {
      console.error('User insert error:', insertError)
      return NextResponse.redirect(`${origin}/?error=user_create_failed`)
    }

    // Issue founding member credit if eligible
    if (isFoundingMember) {
      const { error: creditError } = await supabaseAdmin
        .from('membership_credits')
        .insert({
          user_id: userId,
          credit_type: 'founding_member',
          months_credited: 3,
          note: 'Founding member enrollment — automatic grant at signup',
        })

      if (creditError) {
        // Non-fatal: log but do not block onboarding
        console.error('Membership credit insert error:', creditError)
      }
    }

    // Welcome notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      message: "Your profile is looking good|Add more work you'd love to trade.",
    })
  }

  return NextResponse.redirect(`${origin}/onboarding/step-1`)
}
