import Link from 'next/link'
import styles from './page.module.css'

interface Props {
  searchParams: { email?: string }
}

export default function CheckEmailPage({ searchParams }: Props) {
  const email = searchParams.email
    ? decodeURIComponent(searchParams.email)
    : null

  return (
    <main className={styles.page}>
      <div className={styles.card}>

        {/* Envelope icon */}
        <div className={styles.iconWrap} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="10" width="40" height="28" rx="3" stroke="#c45c3a" strokeWidth="2" />
            <path d="M4 13L24 27L44 13" stroke="#c45c3a" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className={styles.heading}>Check your email</h1>

        <p className={styles.body}>
          We sent a magic link to{' '}
          {email ? (
            <strong className={styles.emailHighlight}>{email}</strong>
          ) : (
            'your inbox'
          )}
          <br />
          Tap that link to create your profile.
        </p>

        <Link href="/" className={styles.backLink}>
          Wrong email? Go back
        </Link>

      </div>
    </main>
  )
}
