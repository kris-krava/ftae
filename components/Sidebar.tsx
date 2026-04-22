'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Eye, PlusSquare, Shuffle01, Bell01 } from '@/components/icons';

interface SidebarProps {
  username: string;
  initials: string;
  avatarUrl: string | null;
  unreadCount: number;
}

const SIDEBAR_TRANSITION = 'transition-[width] duration-[250ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]';
const LABEL_TRANSITION = 'transition-opacity duration-200 ease-out';
const ITEM_BASE =
  'relative flex items-center gap-[18px] h-[48px] mx-[6px] px-[12px] rounded-[8px]';
const ITEM_INACTIVE = 'hover:bg-divider/30';
const ITEM_ACTIVE = 'bg-accent/10';
const ICON_BASE = 'w-[24px] h-[24px] shrink-0';
const LABEL_BASE =
  'whitespace-nowrap font-sans text-[14px] opacity-0 pointer-events-none ' +
  LABEL_TRANSITION +
  ' group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto';

export function Sidebar({ username, initials, avatarUrl, unreadCount }: SidebarProps) {
  const pathname = usePathname() ?? '';
  const isFollowing = pathname.startsWith('/app/following');
  const isDiscover = pathname.startsWith('/app/discover');
  const isTrades = pathname.startsWith('/app/trades');
  const isNotifications = pathname.startsWith('/app/notifications');
  const isProfile = pathname === `/${username}`;

  return (
    <aside
      aria-label="Primary"
      className={`group/sidebar fixed top-0 left-0 bottom-0 hidden tab:block bg-surface w-[60px] hover:w-[200px] overflow-hidden z-40 ${SIDEBAR_TRANSITION}`}
    >
      <span aria-hidden className="absolute right-0 top-0 bottom-0 w-px bg-divider/50" />

      <div className="relative h-[80px]">
        <span
          aria-hidden
          className={`absolute left-[18px] top-[32px] font-script text-ink text-[14px] tracking-[-0.5px] ${LABEL_TRANSITION} opacity-100 group-hover/sidebar:opacity-0`}
        >
          FT
        </span>
        <span
          aria-hidden
          className={`absolute left-[18px] top-[32px] font-script text-ink text-[14px] tracking-[-0.5px] ${LABEL_TRANSITION} opacity-0 group-hover/sidebar:opacity-100`}
        >
          FTAE
        </span>
      </div>

      <ul className="mt-[30px] flex flex-col gap-[6px]">
        <SidebarItem
          href="/app/following"
          label="Following"
          active={isFollowing}
          icon={
            <Heart
              className={`${ICON_BASE} ${isFollowing ? 'text-accent' : 'text-ink'}`}
              fill={isFollowing ? 'currentColor' : 'none'}
            />
          }
        />
        <SidebarItem
          href="/app/discover"
          label="Discover"
          active={isDiscover}
          icon={<Eye className={`${ICON_BASE} ${isDiscover ? 'text-accent' : 'text-ink'}`} />}
        />
        <SidebarItem
          href="/app/add-art"
          label="Add Art"
          active={false}
          icon={<PlusSquare className={`${ICON_BASE} text-ink`} />}
        />
        <SidebarItem
          href="/app/trades"
          label="Trades"
          active={isTrades}
          icon={<Shuffle01 className={`${ICON_BASE} ${isTrades ? 'text-accent' : 'text-ink'}`} />}
        />
        <SidebarItem
          href="/app/notifications"
          label="Notifications"
          active={isNotifications}
          icon={
            <span className="relative shrink-0">
              <Bell01
                className={`${ICON_BASE} ${isNotifications ? 'text-accent' : 'text-ink'}`}
                fill={isNotifications ? 'currentColor' : 'none'}
              />
              {unreadCount > 0 && <BadgeBubble count={unreadCount} />}
            </span>
          }
        />
      </ul>

      <Link
        href={`/${username}`}
        aria-label="Profile"
        aria-current={isProfile ? 'page' : undefined}
        className="absolute bottom-[24px] left-0 right-0 h-[32px] flex items-center"
      >
        {isProfile && (
          <span
            aria-hidden
            className="absolute left-[6px] right-[6px] inset-y-[-8px] rounded-[8px] bg-accent/10"
          />
        )}
        <span className="absolute left-[14px] w-[32px] h-[32px]">
          <Avatar initials={initials} avatarUrl={avatarUrl} size={32} active={isProfile} />
        </span>
        <span
          className={`absolute left-[60px] ${LABEL_BASE} ${
            isProfile ? 'font-semibold text-accent' : 'font-medium text-ink'
          }`}
        >
          Profile
        </span>
      </Link>
    </aside>
  );
}

function SidebarItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_INACTIVE}`}
      >
        {icon}
        <span className={`${LABEL_BASE} ${active ? 'font-semibold text-accent' : 'font-medium text-ink'}`}>
          {label}
        </span>
      </Link>
    </li>
  );
}

function BadgeBubble({ count }: { count: number }) {
  const display = count > 99 ? '99+' : String(count);
  return (
    <span
      aria-label={`${count} unread`}
      className="absolute -top-[2px] -right-[6px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-accent border-[1.5px] border-canvas text-surface text-[11px] font-semibold flex items-center justify-center"
    >
      {display}
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
      className={`rounded-full bg-divider font-semibold text-[12px] flex items-center justify-center ${ring} ${active ? 'text-accent' : 'text-ink'}`}
    >
      {initials}
    </span>
  );
}
