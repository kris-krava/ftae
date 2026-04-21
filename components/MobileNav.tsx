'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, Compass03, PlusSquare, Shuffle01 } from '@/components/icons';

interface MobileNavProps {
  username: string;
  initials: string;
  avatarUrl: string | null;
}

const ITEM_BASE =
  'relative flex items-center justify-center h-[80px] w-[78px]';
const ICON_BASE = 'w-[24px] h-[24px]';

export function MobileNav({ username, initials, avatarUrl }: MobileNavProps) {
  const pathname = usePathname() ?? '';
  const isFollowing = pathname.startsWith('/app/following');
  const isDiscover = pathname.startsWith('/app/discover');
  const isTrades = pathname.startsWith('/app/trades');
  const isProfile = pathname === `/${username}`;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 h-[80px] bg-surface tab:hidden z-40"
    >
      <span aria-hidden className="absolute top-0 inset-x-0 h-px bg-divider/50" />
      <ul className="grid grid-cols-5 h-full justify-items-center">
        <NavItem href="/app/following" label="Following" active={isFollowing}>
          <Heart
            className={`${ICON_BASE} ${isFollowing ? 'text-accent' : 'text-ink'}`}
            fill={isFollowing ? 'currentColor' : 'none'}
          />
        </NavItem>
        <NavItem href="/app/discover" label="Discover" active={isDiscover}>
          <Compass03 className={`${ICON_BASE} ${isDiscover ? 'text-accent' : 'text-ink'}`} />
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
            <Avatar initials={initials} avatarUrl={avatarUrl} size={28} />
            {isProfile && (
              <span
                aria-hidden
                className="absolute bottom-[10px] left-1/2 -translate-x-1/2 h-[3px] w-[20px] rounded-[1.5px] bg-accent"
              />
            )}
          </Link>
        </li>
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
      className="rounded-full bg-divider text-ink font-semibold text-[11px] flex items-center justify-center"
    >
      {initials}
    </span>
  );
}
