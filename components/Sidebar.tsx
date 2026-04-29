'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home02, Eye, PlusSquare, Shuffle01, Bell01 } from '@/components/icons';
import { Avatar } from '@/components/profile/Avatar';
import { SHOW_ADD_ART_NAV } from '@/lib/feature-toggles';

interface SidebarProps {
  username: string;
  initials: string;
  avatarUrl: string | null;
  unreadCount: number;
  avatarFocalX?: number;
  avatarFocalY?: number;
  avatarAspectRatio?: number | null;
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

export function Sidebar({
  username,
  initials,
  avatarUrl,
  unreadCount,
  avatarFocalX = 0.5,
  avatarFocalY = 0.5,
  avatarAspectRatio,
}: SidebarProps) {
  const pathname = usePathname() ?? '';
  const isHome = pathname.startsWith('/app/home');
  const isDiscover = pathname.startsWith('/app/discover');
  const isTrades = pathname.startsWith('/app/trades');
  const isNotifications = pathname.startsWith('/app/notifications');
  const isProfile = pathname === `/${username}`;

  return (
    <aside
      aria-label="Primary"
      className={`group/sidebar fixed top-0 left-0 bottom-0 hidden tab:block bg-surface w-[60px] hover:w-[176px] overflow-hidden z-40 ${SIDEBAR_TRANSITION}`}
    >
      <span aria-hidden className="absolute right-0 top-0 bottom-0 w-px bg-divider/50" />

      <div className="relative h-[100px]">
        <span
          aria-hidden
          className={`absolute left-[19px] top-[32px] font-script text-ink text-[14px] leading-[18px] tracking-[-0.5px] ${LABEL_TRANSITION} opacity-100 group-hover/sidebar:opacity-0`}
        >
          FT
        </span>
        <span
          aria-hidden
          className={`absolute left-[19px] top-[32px] font-script text-ink text-[14px] leading-[18px] tracking-[-0.5px] text-center whitespace-pre ${LABEL_TRANSITION} opacity-0 group-hover/sidebar:opacity-100`}
        >
          {'Free Trade Art\nExchange'}
        </span>
      </div>

      <ul className="flex flex-col gap-[6px]">
        <SidebarItem
          href="/app/home"
          label="Home"
          active={isHome}
          icon={
            <Home02
              className={`${ICON_BASE} ${isHome ? 'text-accent' : 'text-muted'}`}
              fill="none"
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
          href="/app/trades"
          label="Trades"
          active={isTrades}
          icon={<Shuffle01 className={`${ICON_BASE} ${isTrades ? 'text-accent' : 'text-ink'}`} />}
        />
        {SHOW_ADD_ART_NAV && (
          <SidebarItem
            href="/app/add-art"
            label="Add Art"
            active={false}
            icon={<PlusSquare className={`${ICON_BASE} text-ink`} />}
          />
        )}
        <li>
          <Link
            href={`/${username}`}
            aria-label="My profile"
            aria-current={isProfile ? 'page' : undefined}
            className={`${ITEM_BASE} ${isProfile ? ITEM_ACTIVE : ITEM_INACTIVE}`}
          >
            <span className={ICON_BASE}>
              <Avatar
                initials={initials}
                avatarUrl={avatarUrl}
                size={24}
                active={isProfile}
                textSize="text-[10px]"
                focalX={avatarFocalX}
                focalY={avatarFocalY}
                aspectRatio={avatarAspectRatio}
              />
            </span>
            <span
              className={`${LABEL_BASE} ${
                isProfile ? 'font-semibold text-accent' : 'font-medium text-ink'
              }`}
            >
              My Profile
            </span>
          </Link>
        </li>
        <SidebarItem
          href="/app/notifications"
          label="Notifications"
          active={isNotifications}
          icon={
            <span className="relative shrink-0">
              <Bell01
                className={`${ICON_BASE} ${isNotifications ? 'text-accent' : 'text-muted'}`}
                fill="none"
              />
              {unreadCount > 0 && <BadgeBubble count={unreadCount} active={isNotifications} />}
            </span>
          }
        />
      </ul>
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

function BadgeBubble({ count, active }: { count: number; active: boolean }) {
  const display = count > 99 ? '99+' : String(count);
  // Stroke matches what sits behind the badge: surface (white) on an inactive
  // row, canvas (#f2d2c8) on the active row's accent/10 tint.
  const border = active ? 'border-canvas' : 'border-surface';
  return (
    <span
      aria-label={`${count} unread`}
      className={`absolute -top-[8px] -right-[6px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-accent border-[1.5px] ${border} text-surface text-[11px] font-semibold flex items-center justify-center`}
    >
      {display}
    </span>
  );
}

