import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingStep4Form from './OnboardingStep4Form'

export default async function OnboardingStep4Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: mediums } = await supabase
    .from('mediums')
    .select('id, name')
    .order('sort_order')

  return (
    <OnboardingStep4Form
      userId={user.id}
      mediums={mediums ?? []}
    />
  )
}
