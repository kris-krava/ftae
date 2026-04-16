'use client'

import styles from './page.module.css'

export default function ShareButton({ link }: { link: string }) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join me on FTAE', url: link })
      } catch {}
    } else {
      await navigator.clipboard.writeText(link)
    }
  }

  return (
    <button className={styles.shareButton} onClick={handleShare} type="button">
      Share
    </button>
  )
}
