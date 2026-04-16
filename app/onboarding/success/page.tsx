'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function OnboardingSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/app/following'), 2800)
    return () => clearTimeout(t)
  }, [router])

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Multicolor burst illustration — matches Figma */}
        <div className={styles.burst} aria-hidden="true">
          <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
            {/* Central large circle */}
            <circle cx="110" cy="110" r="46" fill="#e8b4a0" />
            {/* Inner small circle offset */}
            <circle cx="102" cy="118" r="18" fill="#dfa090" />

            {/* Purple circle — upper left */}
            <circle cx="62" cy="72" r="22" fill="#9370af" />

            {/* Teal large circle — right */}
            <circle cx="162" cy="90" r="26" fill="#5fa8a8" />
            {/* Teal small circle — upper right */}
            <circle cx="156" cy="54" r="10" fill="#5fa8a8" />

            {/* Yellow small rectangle — upper center */}
            <rect x="106" y="30" width="10" height="22" rx="4" fill="#f0d060" />

            {/* Red/salmon small dot — upper area */}
            <circle cx="88" cy="40" r="5" fill="#d45050" />

            {/* Salmon/pink rounded rectangle — left */}
            <rect x="28" y="100" width="30" height="12" rx="6" fill="#f0a0a0" />

            {/* Brown/terracotta rectangle — right */}
            <rect x="172" y="128" width="26" height="11" rx="5" fill="#a06850" />

            {/* Blue circle — lower left */}
            <circle cx="60" cy="158" r="18" fill="#6090c8" />

            {/* Green small circle — lower center-left */}
            <circle cx="96" cy="176" r="10" fill="#60a870" />

            {/* Yellow circle — lower right */}
            <circle cx="152" cy="166" r="14" fill="#f0c040" />

            {/* Tiny accent dots */}
            <circle cx="130" cy="36" r="4" fill="#d45050" />
            <circle cx="174" cy="64" r="4" fill="#f0d060" />
            <circle cx="40" cy="136" r="4" fill="#9370af" />
            <circle cx="80" cy="190" r="4" fill="#5fa8a8" />
            <circle cx="168" cy="152" r="4" fill="#6090c8" />
          </svg>
        </div>

        <h1 className={styles.heading}>You're a founding member!</h1>

      </div>
    </main>
  )
}
