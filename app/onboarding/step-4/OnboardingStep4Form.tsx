'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface Medium {
  id: string
  name: string
}

interface Props {
  userId: string
  mediums: Medium[]
}

export default function OnboardingStep4Form({ userId, mediums }: Props) {
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  // artworks.medium is varchar — store the name, not an id
  const [mediumName, setMediumName] = useState(mediums[0]?.name ?? '')
  const [height, setHeight] = useState('')
  const [width, setWidth] = useState('')
  const [depth, setDepth] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).slice(0, 6 - photos.length)
    setPhotos(prev => [...prev, ...arr])
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please enter a title for your artwork.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Insert artwork record — columns match the actual DB schema
    const { data: artwork, error: artworkError } = await supabase
      .from('artworks')
      .insert({
        user_id: userId,
        title: title.trim(),
        year: year ? parseInt(year) : null,
        medium: mediumName || null,
        height: height ? parseFloat(height) : null,
        width: width ? parseFloat(width) : null,
        depth: depth ? parseFloat(depth) : null,
      })
      .select('id')
      .single()

    if (artworkError || !artwork) {
      setError(artworkError?.message ?? 'Failed to save artwork.')
      setLoading(false)
      return
    }

    // Upload photos to storage and insert artwork_photos rows
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const ext = photo.name.split('.').pop()
      const path = `${userId}/${artwork.id}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('artwork-photos')
        .upload(path, photo, { cacheControl: '3600', upsert: false })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('artwork-photos')
          .getPublicUrl(path)

        await supabase.from('artwork_photos').insert({
          artwork_id: artwork.id,
          url: publicUrl,
          photo_type: i === 0 ? 'front' : 'detail',
          sort_order: i,
        })
      }
    }

    // Advance profile completion
    await supabase
      .from('users')
      .update({ profile_completion_pct: 100 })
      .eq('id', userId)

    router.push('/onboarding/success')
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Progress bar */}
        <div className={styles.progress}>
          <p className={styles.progressLabel}>Step 4 of 4</p>
          <div className={styles.progressSegments}>
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={`${styles.segment} ${styles.segmentActive}`} />
            <div className={`${styles.segment} ${styles.segmentActive}`} />
          </div>
        </div>

        <h1 className={styles.heading}>Add your first piece, something you would be willing to trade.</h1>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* Photo upload zone */}
          <div
            className={styles.uploadZone}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            aria-label="Upload artwork photos"
          >
            {previews.length === 0 ? (
              <div className={styles.uploadPlaceholder}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="20" fill="rgba(196,92,58,0.12)" />
                  <path d="M20 14v12M14 20h12" stroke="#c45c3a" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M26 26H14a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2h1l2-2h6l2 2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" stroke="#c45c3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="20" cy="21" r="3" stroke="#c45c3a" strokeWidth="1.5"/>
                </svg>
                <p className={styles.uploadLabel}>Add photos</p>
                <p className={styles.uploadSub}>Front, back, and detailed shots</p>
              </div>
            ) : (
              <div className={styles.previewGrid}>
                {previews.map((src, i) => (
                  <div key={i} className={styles.previewWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className={styles.previewImg} />
                    <button
                      type="button"
                      className={styles.removePhoto}
                      onClick={ev => { ev.stopPropagation(); removePhoto(i) }}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {previews.length < 6 && (
                  <div className={styles.addMore}>
                    <span>+</span>
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.hiddenInput}
              onChange={e => handleFiles(e.target.files)}
              disabled={loading}
            />
          </div>

          {/* Title */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="title">Title *</label>
            <input
              id="title"
              className={styles.input}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning on the Altamaha"
              disabled={loading}
            />
          </div>

          {/* Year */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="year">Year</label>
            <input
              id="year"
              className={styles.input}
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder={String(new Date().getFullYear())}
              min="1800"
              max={new Date().getFullYear()}
              disabled={loading}
            />
          </div>

          {/* Medium — stored as varchar in artworks.medium */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="medium">Medium</label>
            <input
              id="medium"
              className={styles.input}
              type="text"
              value={mediumName}
              onChange={e => setMediumName(e.target.value)}
              placeholder="e.g. Oil on linen"
              disabled={loading}
              list="medium-suggestions"
            />
            <datalist id="medium-suggestions">
              {mediums.map(m => <option key={m.id} value={m.name} />)}
            </datalist>
          </div>

          {/* Dimensions in inches */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Dimensions (inches)</label>
            <div className={styles.dimensionRow}>
              <input
                className={styles.input}
                type="number"
                value={height}
                onChange={e => setHeight(e.target.value)}
                placeholder="Height"
                min="0"
                step="0.5"
                disabled={loading}
                aria-label="Height"
              />
              <span className={styles.dimensionX}>×</span>
              <input
                className={styles.input}
                type="number"
                value={width}
                onChange={e => setWidth(e.target.value)}
                placeholder="Width"
                min="0"
                step="0.5"
                disabled={loading}
                aria-label="Width"
              />
            </div>
            <input
              className={styles.input}
              type="number"
              value={depth}
              onChange={e => setDepth(e.target.value)}
              placeholder="Depth (optional)"
              min="0"
              step="0.5"
              disabled={loading}
              aria-label="Depth"
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button
            className={styles.continueButton}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Complete My Profile'}
          </button>


        </form>
      </div>
    </main>
  )
}
