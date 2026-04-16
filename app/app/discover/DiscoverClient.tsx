'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface Medium {
  name: string
}

interface Artist {
  id: string
  name: string | null
  avatar_url: string | null
  location_city: string | null
  bio: string | null
  is_founding_member: boolean
  // Supabase returns the joined relation as an array
  user_mediums: { mediums: Medium[] | Medium | null }[]
}

interface Props {
  currentUserId: string
  artists: Artist[]
  followingSet: string[]
  artworkCounts: Record<string, number>
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function DiscoverClient({ currentUserId, artists, followingSet, artworkCounts }: Props) {
  const [query, setQuery] = useState('')
  const [following, setFollowing] = useState<Set<string>>(new Set(followingSet))
  const [pending, setPending] = useState<Set<string>>(new Set())

  const filtered = artists.filter(a => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      a.name?.toLowerCase().includes(q) ||
      a.location_city?.toLowerCase().includes(q) ||
      a.bio?.toLowerCase().includes(q) ||
      a.user_mediums.some(um => {
        const m = um.mediums
        if (!m) return false
        if (Array.isArray(m)) return m.some(x => x.name.toLowerCase().includes(q))
        return m.name.toLowerCase().includes(q)
      })
    )
  })

  async function toggleFollow(artistId: string) {
    if (pending.has(artistId)) return
    setPending(prev => new Set(prev).add(artistId))

    const supabase = createClient()
    if (following.has(artistId)) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', artistId)
      setFollowing(prev => {
        const next = new Set(prev)
        next.delete(artistId)
        return next
      })
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: artistId })
      setFollowing(prev => new Set(prev).add(artistId))
    }

    setPending(prev => {
      const next = new Set(prev)
      next.delete(artistId)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Discover</h1>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search artists, mediums, locations…"
          />
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && (
          <p className={styles.emptyText}>No artists found.</p>
        )}
        {filtered.map(artist => {
          const isFollowing = following.has(artist.id)
          const isPending = pending.has(artist.id)
          const mediumNames = artist.user_mediums
            .flatMap(um => {
              const m = um.mediums
              if (!m) return []
              if (Array.isArray(m)) return m.map(x => x.name)
              return [m.name]
            })
            .filter(Boolean) as string[]

          return (
            <div key={artist.id} className={styles.card}>
              {/* Avatar */}
              <div className={styles.avatarWrap}>
                {artist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.avatar_url}
                    alt={artist.name ?? ''}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarInitials}>
                    {initials(artist.name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{artist.name}</span>
                  {artist.is_founding_member && (
                    <span className={styles.foundingBadge}>FOUNDING MEMBER</span>
                  )}
                </div>
                {artist.location_city && (
                  <p className={styles.location}>{artist.location_city}</p>
                )}
                {mediumNames.length > 0 && (
                  <div className={styles.mediumTags}>
                    {mediumNames.slice(0, 3).map(m => (
                      <span key={m} className={styles.mediumTag}>{m}</span>
                    ))}
                  </div>
                )}
                <p className={styles.worksCount}>
                  {artworkCounts[artist.id] ?? 0} works ready to trade
                </p>
              </div>

              {/* Follow button */}
              <button
                className={isFollowing ? styles.followingBtn : styles.followBtn}
                onClick={() => toggleFollow(artist.id)}
                disabled={isPending}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
