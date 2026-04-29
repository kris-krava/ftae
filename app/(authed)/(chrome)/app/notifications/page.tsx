import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchUserNotifications } from '@/app/_lib/notifications';
import { markAllNotificationsRead } from '@/app/_actions/notifications';
import { NotificationItem } from '@/components/NotificationItem';

export default async function NotificationsPage() {
  const supabase = await createClient();
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
        <ul className="px-[32px] tab:px-[120px] desk:px-[320px] flex flex-col gap-[4px]">
          {items.map((n) => (
            <li key={n.id} className="contents">
              <NotificationItem
                type={n.type}
                message={n.message}
                isRead={n.is_read}
                actionUrl={n.action_url}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
