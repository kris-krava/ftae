import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Reads the session already set in cookies, ensures a users row exists,
 * then redirects to onboarding. Used by the dev-login bypass flow.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/`)

  const userId  = user.id
  const email   = user.email!

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    const { data: setting } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'founding_member_enrollment_open')
      .single()

    const isFoundingMember = setting?.value === 'true'
    const referralCode = Math.random().toString(36).substring(2, 9).toUpperCase()

    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      is_founding_member: isFoundingMember,
      profile_completion_pct: 0,
      referral_code: referralCode,
    })

    if (insertError) {
      console.error('User insert error:', insertError)
      return NextResponse.redirect(`${origin}/?error=user_create_failed`)
    }

    if (isFoundingMember) {
      await supabaseAdmin.from('membership_credits').insert({
        user_id: userId,
        credit_type: 'founding_member',
        months_credited: 3,
        note: 'Founding member enrollment — automatic grant at signup',
      })
    }

    // Welcome notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      message: "Your profile is looking good|Add more work you'd love to trade.",
    })
  }

  return NextResponse.redirect(`${origin}/onboarding/step-1`)
}
