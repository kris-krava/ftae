import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, created_at, is_read')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const hasNotifications = (notifications?.length ?? 0) > 0

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Notifications</h1>

      {hasNotifications ? (
        <div className={styles.list}>
          {notifications!.map(n => (
            <div key={n.id} className={styles.item}>
              <div className={styles.iconWrap}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 6.67A5 5 0 0 0 5 6.67c0 5.83-2.5 7.5-2.5 7.5h15S15 12.5 15 6.67Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11.44 17.5a1.67 1.67 0 0 1-2.88 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.itemContent}>
                {(() => {
                  const [title, body] = n.message.split('|')
                  return (
                    <>
                      <p className={styles.itemTitle}>{title}</p>
                      {body && <p className={styles.itemBody}>{body}</p>}
                    </>
                  )
                })()}
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.chevron}>
                <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M24 10.67A8 8 0 0 0 8 10.67c0 9.33-4 12-4 12h24S24 20 24 10.67Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.3 28a2.67 2.67 0 0 1-4.6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className={styles.emptyText}>You're all caught up.</p>
        </div>
      )}
    </div>
  )
}
