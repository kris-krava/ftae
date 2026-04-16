'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    // Persist email for the check-email page
    try {
      sessionStorage.setItem('ftae_pending_email', email.trim())
    } catch {}

    router.push(`/check-email?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <main className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.wordmark}>Free Trade<br />Art Exchange</h1>
        <p className={styles.tagline}>Trade Art You've Made<br />For Art You Love</p>
        <div className={styles.accentLine} aria-hidden="true" />
        <p className={styles.bodyCopy}>
          Artist-only community, trading artwork with each other — original art for artist walls.
        </p>
        <p className={styles.boldLine}>Membership fee waived when you trade.</p>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <p className={styles.statsEyebrow}>Preparing for Launch</p>
        <div className={styles.spacer32} aria-hidden="true" />
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>247</span>
            <span className={styles.statLabel}>Founding Artists</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <span className={styles.statNumber}>1,400</span>
            <span className={styles.statLabel}>Pieces Ready For Trade</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <span className={styles.statNumber}>61</span>
            <span className={styles.statLabel}>Days Until Launch</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <p className={styles.ctaHeadline}>Founding Artists Get 3 Months Free</p>
        <form className={styles.ctaForm} onSubmit={handleSubmit} noValidate>
          <input
            className={styles.ctaInput}
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
          <button
            className={styles.ctaButton}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Join or Sign In'}
          </button>
        </form>
        {error && <p className={styles.ctaError}>{error}</p>}
        <p className={styles.ctaHelper}>We'll send a magic link — no password needed.</p>
      </section>

    </main>
  )
}
