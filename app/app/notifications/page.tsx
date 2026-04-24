import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchUserNotifications } from '@/app/_lib/notifications';
import { markAllNotificationsRead } from '@/app/_actions/notifications';
import { NotificationItem } from '@/components/NotificationItem';

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Fetch first so the user sees their original read/unread state, then mark in background.
  const items = await fetchUserNotifications(user.id);
  // Fire-and-forget mark-all-read so the badge clears for the next page view.
  void markAllNotificationsRead();

  return (
    <main className="bg-canvas flex-1 w-full pt-[32px]">
      {items.length === 0 ? (
        <div className="px-[32px] tab:px-[120px] desk:px-[320px] py-[64px] flex flex-col items-center text-center">
          <p className="font-sans text-[15px] text-muted">No notifications yet.</p>
        </div>
      ) : (
        <ul className="px-[32px] tab:px-[120px] desk:px-[320px] flex flex-col">
          {items.map((n, i) => {
            const showDivider = i > 0 && items[i - 1].is_read && n.is_read;
            return (
              <li key={n.id} className="contents">
                {showDivider && (
                  <span aria-hidden className="block h-px w-full bg-divider/50 my-[8px]" />
                )}
                <span className={i === 0 ? '' : (showDivider ? '' : 'mt-[8px]')}>
                  <NotificationItem
                    type={n.type}
                    message={n.message}
                    isRead={n.is_read}
                    actionUrl={n.action_url}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
