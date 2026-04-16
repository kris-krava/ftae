import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DiscoverClient from './DiscoverClient'

export default async function DiscoverPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Load artists (users with name set, excluding self)
  const { data: artists } = await supabase
    .from('users')
    .select(`
      id,
      name,
      avatar_url,
      location_city,
      bio,
      is_founding_member,
      user_mediums(mediums(name))
    `)
    .neq('id', user.id)
    .not('name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40)

  // Load this user's follows to know current follow state
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingSet = new Set((follows ?? []).map(f => f.following_id))

  // Count tradeable artworks per artist
  const artistIds = (artists ?? []).map(a => a.id)
  const artworkCountMap: Record<string, number> = {}
  if (artistIds.length > 0) {
    const { data: artworks } = await supabase
      .from('artworks')
      .select('user_id')
      .eq('is_active', true)
      .eq('is_trade_available', true)
      .in('user_id', artistIds)
    for (const aw of artworks ?? []) {
      artworkCountMap[aw.user_id] = (artworkCountMap[aw.user_id] ?? 0) + 1
    }
  }

  return (
    <DiscoverClient
      currentUserId={user.id}
      artists={artists ?? []}
      followingSet={Array.from(followingSet)}
      artworkCounts={artworkCountMap}
    />
  )
}
