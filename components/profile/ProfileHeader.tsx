import Link from 'next/link';
import { Edit05, Star01, UserCheck01 } from '@/components/icons';
import { Avatar } from '@/components/profile/Avatar';
import type { ProfileUser, ProfileMedium } from '@/app/_lib/profile';
import { deriveInitials } from '@/lib/initials';

interface ProfileHeaderProps {
  user: ProfileUser;
  mediums: ProfileMedium[];
  editHref?: string;
}

export function ProfileHeader({ user, mediums, editHref }: ProfileHeaderProps) {
  const displayName = user.name?.trim() || user.username;
  const initials = deriveInitials(user.name, user.email);
  const websiteHref = user.website_url
    ? user.website_url.startsWith('http')
      ? user.website_url
      : `https://${user.website_url}`
    : null;
  const websiteLabel = user.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const handle = user.social_handle?.trim().replace(/^@+/, '') ?? null;
  const handleLabel = handle ? `@${handle}` : null;
  const handleHref = handle ? socialHandleUrl(user.social_platform, handle) : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <Avatar
          initials={initials}
          avatarUrl={user.avatar_url}
          size={193}
          textSize="text-[48px]"
          priority
        />
        {editHref && (
          <Link
            href={editHref}
            aria-label="Edit Profile"
            className="absolute top-[-10px] right-[-12px] w-[40px] h-[40px] flex items-center justify-center"
          >
            <Edit05 className="w-[20px] h-[20px] text-muted" />
          </Link>
        )}
      </div>
      <div className="flex items-center gap-[8px] mt-[10px]">
        <h1 className="font-serif font-bold text-ink text-[24px] tab:text-[28px] desk:text-[32px]">
          {displayName}
        </h1>
        {user.is_founding_member && (
          <Star01
            className="w-[20px] h-[20px] text-accent"
            fill="currentColor"
            aria-label="Founding Member"
          />
        )}
        {user.studio_verified && (
          <UserCheck01
            className="w-[20px] h-[20px] text-accent"
            aria-label="Studio verified"
          />
        )}
      </div>
      {user.location_city && (
        <p className="font-sans text-[13px] text-muted text-center mt-[2px]">
          {user.location_city}
        </p>
      )}

      {mediums.length > 0 && (
        <div className="flex flex-wrap justify-center gap-[8px] mt-[22px]">
          {mediums.map((m) => (
            <span
              key={m.id}
              className="bg-accent/10 border border-surface rounded-[20px] px-[12px] py-[6px] font-sans font-medium text-[12px] text-accent"
            >
              {m.name}
            </span>
          ))}
        </div>
      )}

      {user.bio && (
        <p className="font-sans text-[14px] text-muted text-center mt-[18px] max-w-[326px]">
          &ldquo;{user.bio}&rdquo;
        </p>
      )}

      {websiteHref && (
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[13px] text-accent text-center mt-[16px]"
        >
          {websiteLabel}
        </a>
      )}
      {handleLabel && handleHref && (
        <a
          href={handleHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-[13px] text-accent text-center mt-[4px]"
        >
          {handleLabel}
        </a>
      )}
      {handleLabel && !handleHref && (
        <span className="font-sans text-[13px] text-accent text-center mt-[4px]">
          {handleLabel}
        </span>
      )}
    </div>
  );
}

function socialHandleUrl(platform: string | null, handle: string): string | null {
  if (!platform) return null;
  const h = encodeURIComponent(handle);
  switch (platform) {
    case 'instagram': return `https://instagram.com/${h}`;
    case 'facebook':  return `https://facebook.com/${h}`;
    case 'x':         return `https://x.com/${h}`;
    case 'tiktok':    return `https://tiktok.com/@${h}`;
    case 'youtube':   return `https://youtube.com/@${h}`;
    case 'pinterest': return `https://pinterest.com/${h}`;
    case 'linkedin':  return `https://linkedin.com/in/${h}`;
    default:          return null;
  }
}
