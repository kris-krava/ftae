import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

export default async function TradesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: trades } = await supabase
    .from('trades')
    .select('id, status, created_at')
    .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  const hasTrades = (trades?.length ?? 0) > 0

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Trades</h1>

      {hasTrades ? (
        <div className={styles.list}>
          {trades!.map(trade => (
            <div key={trade.id} className={styles.tradeRow}>
              <span className={styles.tradeId}>#{trade.id.slice(0, 8)}</span>
              <span className={styles.tradeStatus}>{trade.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="m25.5 1.5 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 16.5v-3A6 6 0 0 1 10.5 7.5H31.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="m10.5 34.5-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M31.5 19.5v3A6 6 0 0 1 25.5 28.5H4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className={styles.emptyHeading}>No trades yet</h2>
          <p className={styles.emptyText}>
            Your active and completed trades will all live here.
          </p>
        </div>
      )}
    </div>
  )
}
