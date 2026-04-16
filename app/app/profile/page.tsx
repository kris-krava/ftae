import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select(`
      name,
      avatar_url,
      location_city,
      bio,
      website_url,
      social_platform,
      social_handle,
      is_founding_member,
      user_mediums(mediums(name))
    `)
    .eq('id', user.id)
    .single()

  const { data: artworks } = await supabase
    .from('artworks')
    .select(`id, title, artwork_photos(url, sort_order)`)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const mediumNames = (profile?.user_mediums ?? [])
    .flatMap((um: { mediums: { name: string }[] | { name: string } | null }) => {
      const m = um.mediums
      if (!m) return []
      if (Array.isArray(m)) return m.map(x => x.name)
      return [m.name]
    })
    .filter(Boolean) as string[]

  const handle = profile?.social_handle
    ? (profile.social_handle.startsWith('@') ? profile.social_handle : `@${profile.social_handle}`)
    : null

  return (
    <div className={styles.page}>

      {/* Edit button */}
      <Link href="/app/profile/edit" className={styles.editBtn} aria-label="Edit profile">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M14.5 2.5a2.121 2.121 0 0 1 3 3L6 17l-4 1 1-4L14.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>

      {/* Avatar */}
      <div className={styles.avatarWrap}>
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt={profile.name ?? ''} className={styles.avatar} />
        ) : (
          <div className={styles.avatarInitials}>
            {initials(profile?.name ?? null)}
          </div>
        )}
      </div>

      {/* Name */}
      <h1 className={styles.name}>{profile?.name ?? 'Your Name'}</h1>

      {/* Location */}
      {profile?.location_city && (
        <p className={styles.location}>{profile.location_city}</p>
      )}

      {/* Founding badge */}
      {profile?.is_founding_member && (
        <span className={styles.foundingBadge}>Founding Member</span>
      )}

      {/* Medium tags */}
      {mediumNames.length > 0 && (
        <div className={styles.mediumTags}>
          {mediumNames.map(m => (
            <span key={m} className={styles.mediumTag}>{m}</span>
          ))}
        </div>
      )}

      {/* Bio */}
      {profile?.bio && (
        <p className={styles.bio}>"{profile.bio}"</p>
      )}

      {/* Links */}
      {(profile?.website_url || handle) && (
        <div className={styles.links}>
          {profile?.website_url && (
            <a
              href={profile.website_url}
              className={styles.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {profile.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
          {handle && (
            <span className={styles.socialHandle}>{handle}</span>
          )}
        </div>
      )}

      <div className={styles.divider} />

      {/* Artwork controls */}
      <div className={styles.artworkControls}>
        <button className={styles.manageBtn} type="button">Manage</button>
        <Link href="/onboarding/step-4" className={styles.addArtBtn}>
          <span className={styles.addArtPlus}>+</span>
          Add Art
        </Link>
      </div>

      {/* Artwork grid */}
      {artworks && artworks.length > 0 ? (
        <div className={styles.artworkGrid}>
          {artworks.map(artwork => {
            const photos = artwork.artwork_photos as { url: string; sort_order: number }[] | null
            const primary = photos?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]
            return (
              <div key={artwork.id} className={styles.artworkCell}>
                {primary?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={primary.url} alt={artwork.title ?? ''} className={styles.artworkImg} />
                ) : (
                  <div className={styles.artworkPlaceholder}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                      <path d="m21 15-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.artworkEmpty}>
          <p className={styles.artworkEmptyText}>Add your first artwork to start trading.</p>
          <Link href="/onboarding/step-4" className={styles.addFirstArtworkBtn}>Add artwork</Link>
        </div>
      )}

    </div>
  )
}
