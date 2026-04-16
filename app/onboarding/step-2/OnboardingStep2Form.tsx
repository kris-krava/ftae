'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

const MAX_BIO = 160

interface Medium {
  id: string
  name: string
}

interface Props {
  userId: string
  mediums: Medium[]
}

export default function OnboardingStep2Form({ userId, mediums }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function toggleMedium(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Delete any existing medium selections then insert the new set
    await supabase.from('user_mediums').delete().eq('user_id', userId)

    if (selected.size > 0) {
      const rows = Array.from(selected).map(medium_id => ({ user_id: userId, medium_id }))
      const { error: insertError } = await supabase.from('user_mediums').insert(rows)
      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    // Save bio and advance completion
    const { error: updateError } = await supabase
      .from('users')
      .update({ bio: bio.trim() || null, profile_completion_pct: 50 })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/onboarding/step-3')
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Progress bar */}
        <div className={styles.progress}>
          <p className={styles.progressLabel}>Step 2 of 4</p>
          <div className={styles.progressSegments}>
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={styles.segment} />
            <div className={styles.segment} />
          </div>
        </div>

        <h1 className={styles.heading}>What's your medium?</h1>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* Medium tag grid */}
          <div className={styles.tagGrid}>
            {mediums.map(medium => {
              const active = selected.has(medium.id)
              return (
                <button
                  key={medium.id}
                  type="button"
                  className={active ? styles.tagActive : styles.tagInactive}
                  onClick={() => toggleMedium(medium.id)}
                >
                  {medium.name}
                </button>
              )
            })}
          </div>

          {/* Artist bio */}
          <div className={styles.bioSection}>
            <label className={styles.bioLabel} htmlFor="bio">
              In one line, who are you as an artist?
            </label>
            <textarea
              id="bio"
              className={styles.bioInput}
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="e.g. I paint figurative and landscape oil paintings in rural Georgia"
              disabled={loading}
              maxLength={MAX_BIO}
              rows={3}
            />
            <p className={styles.charCount}>{bio.length} / {MAX_BIO}</p>
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
