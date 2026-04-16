import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShareButton from './ShareButton'
import styles from './page.module.css'

const LAUNCH_DATE = new Date('2026-06-15T00:00:00Z')

function daysUntilLaunch(): number {
  const now = new Date()
  const diff = LAUNCH_DATE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default async function FollowingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('referral_code, name')
    .eq('id', user.id)
    .single()

  // Founding members count
  const { count: foundingCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_founding_member', true)

  // Pieces ready for trade
  const { count: piecesCount } = await supabase
    .from('artworks')
    .select('*', { count: 'exact', head: true })
    .eq('is_trade_available', true)
    .eq('is_active', true)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const referralLink = profile?.referral_code
    ? `${baseUrl}/r/${profile.referral_code}`
    : ''

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Following</span>
      </div>

      {/* Blurred grid background */}
      <div className={styles.gridBg} aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className={styles.gridCell} style={{ background: GRID_COLORS[i % GRID_COLORS.length] }} />
        ))}
      </div>
      <div className={styles.overlay} aria-hidden="true" />

      {/* Centered content group */}
      <div className={styles.contentGroup}>

      <p className={styles.teaserText}>
        Soon you'll see art that's available for trade from artists you follow.
      </p>

      {/* Panel */}
      <div className={styles.panel}>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{(foundingCount ?? 0).toLocaleString()}</span>
            <span className={styles.statLabel}>Founding{'\n'}Members</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{(piecesCount ?? 0).toLocaleString()}</span>
            <span className={styles.statLabel}>Pieces Ready{'\n'}For Trade</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{daysUntilLaunch()}</span>
            <span className={styles.statLabel}>Days Until{'\n'}Launch</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Referral */}
        <div className={styles.referralSection}>
          <p className={styles.referralHeading}>Invite artists you know</p>
          <div className={styles.referralRow}>
            <input
              className={styles.referralInput}
              type="text"
              defaultValue={referralLink}
              readOnly
              aria-label="Your referral link"
            />
            <ShareButton link={referralLink} />
          </div>
          <p className={styles.referralSub}>
            You earn one free month for every artist who joins
          </p>
        </div>

      </div>

      </div>{/* end contentGroup */}
    </div>
  )
}

// Matches the muted palette from the Figma grid
const GRID_COLORS = [
  '#8c7a73', '#b29e94', '#73858c',
  '#9e947a', '#b8a6ad', '#85998c',
  '#ad8c85', '#7a8c9e', '#a69eb8',
  '#949e8c', '#b8ad8c', '#8c9ead',
  '#c7ad8c', '#998cb2', '#809485',
]
