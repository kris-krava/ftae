import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingStep2Form from './OnboardingStep2Form'

export default async function OnboardingStep2Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Load canonical mediums from DB (public read, no auth needed)
  const { data: mediums } = await supabase
    .from('mediums')
    .select('id, name')
    .order('sort_order')

  return (
    <OnboardingStep2Form
      userId={user.id}
      mediums={mediums ?? []}
    />
  )
}
