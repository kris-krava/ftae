'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell01 } from '@/components/icons';

interface MobileBellProps {
  userId: string;
  initialUnread: number;
}

export function MobileBell({ userId, initialUnread }: MobileBellProps) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notif-badge:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async () => {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);
          setUnread(count ?? 0);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/app/notifications"
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
      className="fixed top-[16px] right-[16px] tab:hidden z-40 flex items-center justify-center w-[48px] h-[48px]"
    >
      <span className="relative">
        <Bell01 className="w-[24px] h-[24px] text-ink" />
        {unread > 0 && (
          <span className="absolute -top-[2px] -right-[6px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-accent border-[1.5px] border-canvas text-surface text-[11px] font-semibold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>
    </Link>
  );
}
