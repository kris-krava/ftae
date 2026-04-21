'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Compass03, PlusSquare, Shuffle01, Bell01 } from '@/components/icons';

interface SidebarProps {
  username: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  unreadCount: number;
}

const SIDEBAR_TRANSITION = 'transition-[width] duration-[250ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]';
const LABEL_TRANSITION = 'transition-opacity duration-200 ease-out';
const ITEM_BASE =
  'group/item relative flex items-center h-[48px] mx-[6px] rounded-[8px]';
const ITEM_INACTIVE = 'hover:bg-divider/30';
const ITEM_ACTIVE = 'bg-accent/10';
const ICON_FRAME = 'flex items-center justify-center w-[48px] h-[48px] shrink-0';
const ICON_BASE = 'w-[24px] h-[24px]';
const LABEL_BASE =
  'absolute left-[54px] whitespace-nowrap font-sans text-[14px] opacity-0 pointer-events-none ' +
  LABEL_TRANSITION +
  ' group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto';

export function Sidebar({ username, displayName, initials, avatarUrl, unreadCount }: SidebarProps) {
  const pathname = usePathname() ?? '';
  const isFollowing = pathname.startsWith('/app/following');
  const isDiscover = pathname.startsWith('/app/discover');
  const isTrades = pathname.startsWith('/app/trades');
  const isNotifications = pathname.startsWith('/app/notifications');
  const isProfile = pathname === `/${username}`;

  return (
    <aside
      aria-label="Primary"
      className={`group/sidebar fixed top-0 left-0 bottom-0 hidden tab:block bg-surface w-[60px] hover:w-[240px] z-40 ${SIDEBAR_TRANSITION}`}
    >
      <span aria-hidden className="absolute right-0 top-0 bottom-0 w-px bg-divider/50" />

      <div className="relative h-[80px] flex items-center">
        <span
          aria-hidden
          className={`absolute left-[19px] font-script text-ink text-[14px] tracking-[-0.5px] ${LABEL_TRANSITION} group-hover/sidebar:opacity-100 opacity-0 pointer-events-none`}
        >
          FTAE
        </span>
        <span
          aria-hidden
          className={`absolute left-[14px] font-script text-ink text-[14px] tracking-[-0.5px] ${LABEL_TRANSITION} opacity-100 group-hover/sidebar:opacity-0`}
        >
          FT
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
          icon={<Compass03 className={`${ICON_BASE} ${isDiscover ? 'text-accent' : 'text-ink'}`} />}
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
            <span className="relative">
              <Bell01 className={`${ICON_BASE} ${isNotifications ? 'text-accent' : 'text-ink'}`} />
              {unreadCount > 0 && <BadgeBubble count={unreadCount} />}
            </span>
          }
        />
      </ul>

      <Link
        href={`/${username}`}
        aria-label="Your profile"
        aria-current={isProfile ? 'page' : undefined}
        className="absolute bottom-[24px] left-0 right-0 flex items-center h-[32px]"
      >
        <span className={ICON_FRAME}>
          <Avatar initials={initials} avatarUrl={avatarUrl} size={32} />
        </span>
        <span
          className={`absolute left-[60px] whitespace-nowrap font-sans font-medium text-[14px] text-ink opacity-0 ${LABEL_TRANSITION} group-hover/sidebar:opacity-100`}
        >
          {displayName}
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
        <span className={ICON_FRAME}>{icon}</span>
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
}: {
  initials: string;
  avatarUrl: string | null;
  size: number;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full bg-divider text-ink font-semibold text-[12px] flex items-center justify-center"
    >
      {initials}
    </span>
  );
}
