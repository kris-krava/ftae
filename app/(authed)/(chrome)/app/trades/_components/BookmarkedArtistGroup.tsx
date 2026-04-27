'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/profile/Avatar';
import type { BookmarkedArtistGroup as BookmarkedArtistGroupData } from '@/app/_lib/bookmarks';

interface BookmarkedArtistGroupProps {
  group: BookmarkedArtistGroupData;
  /** Open the artwork modal for the given id. */
  onOpenArtwork: (artworkId: string) => void;
  /** Tablet/desktop: render with p-[16px] all around (group sits inside a grid
   * cell). Mobile (default): only py-[16px]; the header carries its own
   * px-[16px] and thumbnails go edge-to-edge of the viewport. */
  inset?: boolean;
}

/** When an artist has more than this many saved pieces, the bucket caps at
 * COLLAPSED_LIMIT and shows a centered "Show All" CTA that expands inline. */
const SHOW_ALL_THRESHOLD = 10;
const COLLAPSED_LIMIT = 10;

function locationLabel(city: string | null, region: string | null): string | null {
  const parts: string[] = [];
  if (city?.trim()) parts.push(city.trim());
  if (region?.trim()) parts.push(region.trim());
  return parts.length > 0 ? parts.join(', ') : null;
}

function initialsFor(name: string | null, username: string): string {
  const source = name?.trim() || username;
  return source.slice(0, 2).toUpperCase();
}

export function BookmarkedArtistGroup({
  group,
  onOpenArtwork,
  inset = false,
}: BookmarkedArtistGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const { artist, pieces } = group;

  const overThreshold = pieces.length > SHOW_ALL_THRESHOLD;
  const visiblePieces = expanded || !overThreshold
    ? pieces
    : pieces.slice(0, COLLAPSED_LIMIT);

  const displayName = artist.name?.trim() || artist.username;
  const location = locationLabel(artist.location_city, artist.location_region);

  return (
    <div className={'flex flex-col gap-[12px] ' + (inset ? 'p-[16px]' : 'py-[16px]')}>
      <div className={'flex items-center justify-between ' + (inset ? '' : 'px-[16px]')}>
        <Link
          href={`/${artist.username}`}
          className="flex items-center gap-[12px] min-w-0"
        >
          <Avatar
            initials={initialsFor(artist.name, artist.username)}
            avatarUrl={artist.avatar_url}
            size={40}
            textSize="text-[14px]"
            focalX={artist.avatar_focal_x ?? 0.5}
            focalY={artist.avatar_focal_y ?? 0.5}
            aspectRatio={artist.avatar_aspect_ratio}
          />
          <div className="flex flex-col gap-[2px] min-w-0">
            <span className="font-sans font-semibold text-[14px] text-ink truncate">
              {displayName}
            </span>
            {location && (
              <span className="font-sans text-[12px] text-muted truncate">
                {location}
              </span>
            )}
          </div>
        </Link>
      </div>

      <div className="flex flex-wrap gap-[4px_5px] w-full">
        {visiblePieces.map((piece) => (
          <button
            key={piece.id}
            type="button"
            onClick={() => onOpenArtwork(piece.id)}
            aria-label={piece.title ?? 'View artwork'}
            className="basis-[calc((100%-20px)/5)] aspect-square rounded-[2px] overflow-hidden bg-divider relative shrink-0"
          >
            {piece.photo_url && (
              <Image
                src={piece.photo_url}
                alt={piece.title ?? ''}
                fill
                sizes="(min-width: 1280px) 70px, (min-width: 768px) 56px, 75px"
                className="object-cover"
                style={{
                  objectPosition: `${(piece.photo_focal_x ?? 0.5) * 100}% ${(piece.photo_focal_y ?? 0.5) * 100}%`,
                }}
              />
            )}
          </button>
        ))}
      </div>

      {overThreshold && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="font-sans font-medium text-[13px] text-accent text-center w-full"
        >
          Show All
        </button>
      )}
    </div>
  );
}
