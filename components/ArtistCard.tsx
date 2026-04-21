'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star01, UserCheck01 } from '@/components/icons';
import { Avatar } from '@/components/profile/Avatar';
import { deriveInitials } from '@/lib/initials';
import { toggleFollow } from '@/app/_actions/follow';
import type { DiscoverArtist } from '@/app/_lib/artists';

interface ArtistCardProps {
  artist: DiscoverArtist;
  initialFollowing: boolean;
  isAuthenticated: boolean;
}

export function ArtistCard({ artist, initialFollowing, isAuthenticated }: ArtistCardProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [, start] = useTransition();
  const displayName = artist.name?.trim() || artist.username;
  const initials = deriveInitials(artist.name, artist.email);
  const piecesLabel = `${artist.pieces_count} ${artist.pieces_count === 1 ? 'Piece' : 'Pieces'}`;
  const tradesLabel = `${artist.trades_count} ${artist.trades_count === 1 ? 'Trade' : 'Trades'}`;

  function onToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    const next = !following;
    setFollowing(next);
    start(async () => {
      const result = await toggleFollow(artist.id, artist.username);
      if (!result.ok || result.following !== next) setFollowing((p) => !p);
    });
  }

  return (
    <Link
      href={`/${artist.username}`}
      className="block bg-surface border border-field/35 rounded-[12px] p-[16px]"
    >
      <div className="flex gap-[12px] items-start">
        <Avatar
          initials={initials}
          avatarUrl={artist.avatar_url}
          size={48}
          textSize="text-[16px]"
          className="bg-accent/15"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
          <div className="flex items-center gap-[6px]">
            <p className="font-sans font-semibold text-ink text-[15px] truncate">{displayName}</p>
            {artist.is_founding_member && (
              <Star01
                className="w-[16px] h-[16px] text-accent shrink-0"
                fill="currentColor"
                aria-label="Founding member"
              />
            )}
            {artist.studio_verified && (
              <UserCheck01
                className="w-[16px] h-[16px] text-accent shrink-0"
                aria-label="Studio verified"
              />
            )}
          </div>
          {artist.location_city && (
            <p className="font-sans text-muted text-[13px] truncate">{artist.location_city}</p>
          )}
          {artist.mediums.length > 0 && (
            <div className="flex flex-wrap gap-[4px_6px]">
              {artist.mediums.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="bg-accent/10 rounded-[20px] px-[8px] py-[3px] font-sans font-medium text-[11px] text-accent"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
          <p className="font-sans text-[12px] text-muted/80">
            {piecesLabel}  |  {tradesLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={following}
          className={
            'rounded-[20px] px-[14px] py-[8px] font-sans font-semibold text-[13px] shrink-0 ' +
            (following
              ? 'bg-accent/10 text-accent border border-accent/0 font-medium'
              : 'bg-surface text-accent border-[1.5px] border-accent')
          }
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
    </Link>
  );
}
