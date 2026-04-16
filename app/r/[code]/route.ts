import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const { origin } = new URL(request.url)
  const code = params.code

  // Look up the referral code owner
  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .single()

  if (referrer) {
    // Log the click (visitor_id unknown at this point — filled in after auth)
    await supabaseAdmin.from('referrals').insert({
      referrer_id: referrer.id,
      referral_code: code,
    })
  }

  return NextResponse.redirect(`${origin}/?ref=${code}`)
}
