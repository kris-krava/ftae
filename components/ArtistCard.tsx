'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star01, UserCheck01 } from '@/components/icons';
import { Avatar } from '@/components/profile/Avatar';
import type { SearchArtistResult } from '@/app/_lib/artists';

interface ArtistCardProps {
  artist: SearchArtistResult;
  /** Active query — used to flag conditional rows (location, medium chips). */
  query: string;
  onOpenArtwork: (artworkId: string) => void;
}

/**
 * Search-results variant of the artist card. Top-aligned avatar, conditional
 * Location and Medium-chip rows, and up to 3 artwork thumbnails (matched-medium
 * pieces sorted first). No Follow button and no piece/trade counts — see
 * project_ftae_search memory for the locked spec.
 */
export function ArtistCard({ artist, query, onOpenArtwork }: ArtistCardProps) {
  const displayName = artist.name?.trim() || artist.username;
  const trimmedQuery = query.trim();
  const needle = trimmedQuery.toLowerCase();
  const showLocation = Boolean(
    artist.location_city &&
      needle.length > 0 &&
      artist.location_city.toLowerCase().includes(needle),
  );
  const chips = artist.matched_mediums.slice(0, 3);

  return (
    <Link
      href={`/${artist.username}`}
      aria-label={`${displayName}'s profile`}
      className="block bg-surface border border-field/35 rounded-[12px] p-[16px]"
    >
      <div className="flex gap-[12px] items-start">
        <Avatar
          initials={artist.initial}
          avatarUrl={artist.avatar_url}
          size={48}
          textSize="text-[16px]"
          className="bg-accent/15"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
          <div className="flex items-center gap-[6px]">
            <p className="font-sans font-semibold text-ink text-[14px] truncate">
              {displayName}
            </p>
            {artist.is_founding_member && (
              <Star01
                className="w-[16px] h-[16px] text-accent shrink-0"
                fill="currentColor"
                aria-label="Founding Member"
              />
            )}
            {artist.studio_verified && (
              <UserCheck01
                className="w-[16px] h-[16px] text-accent shrink-0"
                aria-label="Studio verified"
              />
            )}
          </div>
          <p className="font-sans text-muted text-[13px] truncate">@{artist.username}</p>
          {showLocation && (
            <p className="font-sans text-muted text-[13px] truncate">{artist.location_city}</p>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-[4px_6px]">
              {chips.map((m) => (
                <span
                  key={m}
                  className="bg-accent/10 rounded-[20px] px-[8px] py-[3px] font-sans font-medium text-[11px] text-accent"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {artist.artwork_previews.length > 0 && (
        <div className="mt-[12px] flex gap-[8px]">
          {artist.artwork_previews.map((preview) => (
            <button
              key={preview.id}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenArtwork(preview.id);
              }}
              aria-label="View artwork"
              className="relative aspect-square overflow-hidden rounded-[6px] flex-1 min-w-0 bg-divider"
            >
              {preview.primary_photo_url && (
                <Image
                  src={preview.primary_photo_url}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 118px, (min-width: 768px) 101px, 95px"
                  className="object-cover"
                  style={{
                    objectPosition: `${preview.primary_photo_focal_x * 100}% ${preview.primary_photo_focal_y * 100}%`,
                  }}
                />
              )}
            </button>
          ))}
          {Array.from({ length: 3 - artist.artwork_previews.length }).map((_, i) => (
            <div key={`spacer-${i}`} aria-hidden className="flex-1 min-w-0" />
          ))}
        </div>
      )}
    </Link>
  );
}
