'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

// Values must match the social_platform enum in the DB
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'x',         label: 'Twitter / X' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'linkedin',  label: 'LinkedIn' },
]

interface Props {
  userId: string
  defaultWebsite: string
  defaultPlatform: string
  defaultHandle: string
}

export default function OnboardingStep3Form({
  userId,
  defaultWebsite,
  defaultPlatform,
  defaultHandle,
}: Props) {
  const [website, setWebsite] = useState(defaultWebsite)
  const [platform, setPlatform] = useState(defaultPlatform || PLATFORMS[0].value)
  const [handle, setHandle] = useState(defaultHandle)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('users')
      .update({
        website_url: website.trim() || null,
        social_platform: handle.trim() ? platform : null,
        social_handle: handle.trim() || null,
        profile_completion_pct: 75,
      })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/onboarding/step-4')
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Progress bar */}
        <div className={styles.progress}>
          <p className={styles.progressLabel}>Step 3 of 4</p>
          <div className={styles.progressSegments}>
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={styles.segment} />
          </div>
        </div>

        <h1 className={styles.heading}>Add your links?</h1>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* Website */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="website">
              Your website
            </label>
            <input
              id="website"
              className={styles.input}
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yoursite.com"
              disabled={loading}
            />
          </div>

          {/* Social */}
          <div className={styles.fieldGroup}>
            <div className={styles.socialRow}>
              <select
                className={styles.platformSelect}
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                disabled={loading}
                aria-label="Social platform"
              >
                {PLATFORMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className={styles.socialDivider} />
              <input
                id="handle"
                className={styles.handleInput}
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@yourhandle"
                disabled={loading}
              />
            </div>
            <p className={styles.helper}>All optional, share what you have.</p>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button
            className={styles.continueButton}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>


        </form>
      </div>
    </main>
  )
}
