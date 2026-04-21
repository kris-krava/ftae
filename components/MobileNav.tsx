'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, Eye, PlusSquare, Shuffle01, Bell01 } from '@/components/icons';

interface MobileNavProps {
  username: string;
  initials: string;
  avatarUrl: string | null;
  userId: string;
  initialUnread: number;
}

const ITEM_BASE = 'relative flex items-center justify-center h-[80px] w-[65px]';
const ICON_BASE = 'w-[24px] h-[24px]';

export function MobileNav({ username, initials, avatarUrl, userId, initialUnread }: MobileNavProps) {
  const pathname = usePathname() ?? '';
  const isFollowing = pathname.startsWith('/app/following');
  const isDiscover = pathname.startsWith('/app/discover');
  const isTrades = pathname.startsWith('/app/trades');
  const isNotifications = pathname.startsWith('/app/notifications');
  const isProfile = pathname === `/${username}`;

  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`mobile-nav-badge:${userId}`)
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
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 h-[80px] bg-surface tab:hidden z-40"
    >
      <span aria-hidden className="absolute top-0 inset-x-0 h-px bg-divider/50" />
      <ul className="grid grid-cols-6 h-full justify-items-center">
        <NavItem href="/app/following" label="Following" active={isFollowing}>
          <Heart
            className={`${ICON_BASE} ${isFollowing ? 'text-accent' : 'text-ink'}`}
            fill={isFollowing ? 'currentColor' : 'none'}
          />
        </NavItem>
        <NavItem href="/app/discover" label="Discover" active={isDiscover}>
          <Eye className={`${ICON_BASE} ${isDiscover ? 'text-accent' : 'text-ink'}`} />
        </NavItem>
        <NavItem href="/app/add-art" label="Add Art" active={false}>
          <PlusSquare className={`${ICON_BASE} text-ink`} />
        </NavItem>
        <NavItem href="/app/trades" label="Trades" active={isTrades}>
          <Shuffle01 className={`${ICON_BASE} ${isTrades ? 'text-accent' : 'text-ink'}`} />
        </NavItem>
        <li className="contents">
          <Link
            href={`/${username}`}
            aria-label="Your profile"
            aria-current={isProfile ? 'page' : undefined}
            className={ITEM_BASE}
          >
            <Avatar initials={initials} avatarUrl={avatarUrl} size={28} active={isProfile} />
            {isProfile && (
              <span
                aria-hidden
                className="absolute bottom-[10px] left-1/2 -translate-x-1/2 h-[3px] w-[20px] rounded-[1.5px] bg-accent"
              />
            )}
          </Link>
        </li>
        <NavItem
          href="/app/notifications"
          label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
          active={isNotifications}
        >
          <span className="relative">
            <Bell01
              className={`${ICON_BASE} ${isNotifications ? 'text-accent' : 'text-ink'}`}
              fill={isNotifications ? 'currentColor' : 'none'}
            />
            {unread > 0 && <Badge count={unread} />}
          </span>
        </NavItem>
      </ul>
    </nav>
  );
}

function NavItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="contents">
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={ITEM_BASE}
      >
        {children}
        {active && (
          <span
            aria-hidden
            className="absolute bottom-[10px] left-1/2 -translate-x-1/2 h-[3px] w-[20px] rounded-[1.5px] bg-accent"
          />
        )}
      </Link>
    </li>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -top-[2px] -right-[6px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-accent border-[1.5px] border-canvas text-surface text-[11px] font-semibold flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Avatar({
  initials,
  avatarUrl,
  size,
  active,
}: {
  initials: string;
  avatarUrl: string | null;
  size: number;
  active?: boolean;
}) {
  const ring = active ? 'ring-2 ring-accent' : '';
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={`rounded-full object-cover ${ring}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={`rounded-full bg-divider font-semibold text-[11px] flex items-center justify-center ${ring} ${active ? 'text-accent' : 'text-ink'}`}
    >
      {initials}
    </span>
  );
}
