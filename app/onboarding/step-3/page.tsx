import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingStep3Form from './OnboardingStep3Form'

export default async function OnboardingStep3Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('website_url, social_platform, social_handle')
    .eq('id', user.id)
    .single()

  return (
    <OnboardingStep3Form
      userId={user.id}
      defaultWebsite={profile?.website_url ?? ''}
      defaultPlatform={profile?.social_platform ?? ''}
      defaultHandle={profile?.social_handle ?? ''}
    />
  )
}
