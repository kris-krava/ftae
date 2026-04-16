'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

function emailToDisplayName(email: string): string {
  const local = email.split('@')[0]
  return local
    .replace(/[._\-+]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

interface Props {
  userId: string
  userEmail: string
}

export default function OnboardingStep1Form({ userId, userEmail }: Props) {
  const [displayName, setDisplayName] = useState(emailToDisplayName(userEmail))
  const [location, setLocation] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&featuretype=city`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        const places = (data as { address: { city?: string; town?: string; village?: string; state?: string; country?: string } }[])
          .map(r => {
            const a = r.address
            const city = a.city ?? a.town ?? a.village ?? ''
            const parts = [city, a.state, a.country].filter(Boolean)
            return parts.join(', ')
          })
          .filter(Boolean)
        setSuggestions([...new Set(places)])
      } catch {
        // silently ignore — field still works as a plain text input
      }
    }, 300)
  }, [])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Please enter a display name.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    let avatarUrl: string | null = null

    // Upload avatar if one was selected
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        // Non-fatal: continue without photo rather than blocking the user
        console.warn('Avatar upload failed:', uploadError.message)
      } else {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }
    }

    // Save name, location, and optional avatar to the users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: displayName.trim(),
        location_city: location.trim() || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        profile_completion_pct: 25,
      })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/onboarding/step-2')
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Progress bar */}
        <div className={styles.progress}>
          <p className={styles.progressLabel}>Step 1 of 4</p>
          <div className={styles.progressSegments}>
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={styles.segment} />
            <div className={styles.segment} />
            <div className={styles.segment} />
          </div>
        </div>

        <h1 className={styles.heading}>Let's build your profile.</h1>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* Photo upload */}
          <div className={styles.photoSection}>
            <button
              type="button"
              className={styles.photoButton}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile photo"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile preview"
                  className={styles.photoPreview}
                />
              ) : (
                <span className={styles.photoPlus} aria-hidden="true">+</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles.fileInput}
              tabIndex={-1}
            />
            <p className={styles.photoHint}>Tap to add photo</p>
          </div>

          {/* Display name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className={styles.input}
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
              required
              disabled={loading}
            />
          </div>

          {/* Location */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="location">
              Where are you based?
            </label>
            <input
              id="location"
              className={styles.input}
              type="text"
              value={location}
              onChange={e => { setLocation(e.target.value); fetchSuggestions(e.target.value) }}
              placeholder="Start typing your city..."
              disabled={loading}
              autoComplete="off"
              list="location-suggestions"
            />
            <datalist id="location-suggestions">
              {suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
            <p className={styles.locationHint}>e.g. Atlanta, GA, USA</p>
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
