import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingStep1Form from './OnboardingStep1Form'

export default async function OnboardingStep1Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return <OnboardingStep1Form userId={user.id} userEmail={user.email ?? ''} />
}
