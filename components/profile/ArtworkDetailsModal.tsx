'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { XClose, ChevronLeft, ChevronRight, Star01 } from '@/components/icons';
import { FollowButton } from './FollowButton';
import type { ArtworkArtist, ArtworkDetail } from '@/app/_lib/profile';

interface ArtworkDetailsModalProps {
  artwork: ArtworkDetail;
  neighbors: { prev: string | null; next: string | null };
  initialFollowing: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  /** "overlay" dismisses via router.back(); "standalone" pushes to artist profile. */
  mode: 'overlay' | 'standalone';
  /** When provided, called on dismiss instead of the default router behavior. */
  onClose?: () => void;
  /** When provided, prev/next chevrons call this with the neighbor's id instead
   * of navigating via a Link. Used for the client-side Discover modal, where
   * cross-subtree navigation to /[username]/artwork/[id] trips Next.js's
   * parallel-slot intercept with undefined params. */
  onNavigate?: (artworkId: string) => void;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'today';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function formatPosted(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDimensions(w: number | null, h: number | null, d: number | null): string | null {
  if (w == null || h == null) return null;
  const depth = d != null ? ` × ${d}` : '';
  return `${w} × ${h}${depth} in`;
}

export function ArtworkDetailsModal({
  artwork,
  neighbors,
  initialFollowing,
  isAuthenticated,
  isOwner,
  mode,
  onClose,
  onNavigate,
}: ArtworkDetailsModalProps) {
  const router = useRouter();
  const [imageIdx, setImageIdx] = useState(0);
  const photos = artwork.photos;
  const hasMultiple = photos.length > 1;
  const currentPhoto = photos[imageIdx];

  const close = useCallback(() => {
    if (onClose) onClose();
    else if (mode === 'overlay') router.back();
    else router.push(`/${artwork.artist.username}`);
  }, [onClose, mode, router, artwork.artist.username]);

  const prevImage = useCallback(() => {
    setImageIdx((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const nextImage = useCallback(() => {
    setImageIdx((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  // Keyboard: Escape → close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const yearMedium = [artwork.year, artwork.medium].filter(Boolean).join(' · ');
  const dimensions = formatDimensions(artwork.width, artwork.height, artwork.depth);
  const displayName = artwork.artist.name?.trim() || artwork.artist.username;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={artwork.title ?? 'Artwork details'}
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto"
      onClick={(e) => {
        if (e.currentTarget === e.target) close();
      }}
    >
      {/* Floating close — top-right of viewport */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="fixed top-[16px] right-[16px] tab:top-[24px] tab:right-[24px] w-[44px] h-[44px] flex items-center justify-center z-[60]"
      >
        <XClose className="w-[24px] h-[24px] text-surface" strokeWidth={1.67} />
      </button>

      {/* Prev/next piece navigation — floating on overlay at viewport vertical center */}
      {neighbors.prev &&
        (onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate(neighbors.prev!)}
            aria-label="Previous piece"
            className="fixed left-[4px] tab:left-[16px] desk:left-[32px] top-1/2 -translate-y-1/2 w-[44px] h-[44px] flex items-center justify-center z-[60]"
          >
            <ChevronLeft className="w-[24px] h-[24px] text-surface" strokeWidth={1.67} />
          </button>
        ) : (
          <Link
            href={`/${artwork.artist.username}/artwork/${neighbors.prev}`}
            replace
            aria-label="Previous piece"
            className="fixed left-[4px] tab:left-[16px] desk:left-[32px] top-1/2 -translate-y-1/2 w-[44px] h-[44px] flex items-center justify-center z-[60]"
          >
            <ChevronLeft className="w-[24px] h-[24px] text-surface" strokeWidth={1.67} />
          </Link>
        ))}
      {neighbors.next &&
        (onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate(neighbors.next!)}
            aria-label="Next piece"
            className="fixed right-[4px] tab:right-[16px] desk:right-[32px] top-1/2 -translate-y-1/2 w-[44px] h-[44px] flex items-center justify-center z-[60]"
          >
            <ChevronRight className="w-[24px] h-[24px] text-surface" strokeWidth={1.67} />
          </button>
        ) : (
          <Link
            href={`/${artwork.artist.username}/artwork/${neighbors.next}`}
            replace
            aria-label="Next piece"
            className="fixed right-[4px] tab:right-[16px] desk:right-[32px] top-1/2 -translate-y-1/2 w-[44px] h-[44px] flex items-center justify-center z-[60]"
          >
            <ChevronRight className="w-[24px] h-[24px] text-surface" strokeWidth={1.67} />
          </Link>
        ))}

      <div className="min-h-full flex items-center justify-center px-[24px] py-[24px] tab:px-[60px] tab:py-[60px]">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-surface rounded-[12px] shadow-modal overflow-hidden w-full max-w-[342px] tab:max-w-[560px] desk:max-w-[1000px] flex flex-col desk:flex-row"
        >
          {/* Image column — object-contain so art is never cropped */}
          <div className="relative w-full desk:w-[600px] desk:h-[640px] aspect-square desk:aspect-auto bg-ink/[0.06]">
            {currentPhoto?.url && (
              <Image
                src={currentPhoto.url}
                alt={artwork.title ?? ''}
                fill
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 560px, 342px"
                className={`object-contain ${isOwner ? '' : 'blur-2xl scale-110'}`}
                priority
              />
            )}

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Previous image"
                  className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full bg-surface/90 flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
                >
                  <ChevronLeft className="w-[20px] h-[20px] text-ink" strokeWidth={1.67} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Next image"
                  className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full bg-surface/90 flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
                >
                  <ChevronRight className="w-[20px] h-[20px] text-ink" strokeWidth={1.67} />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[12px] flex gap-[6px]">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={
                        'w-[6px] h-[6px] rounded-full ' +
                        (i === imageIdx ? 'bg-surface' : 'bg-surface/50')
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content column */}
          <div className="flex-1 flex flex-col min-w-0 desk:w-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-[12px] p-[16px] tab:p-[24px]">
              <Link
                href={`/${artwork.artist.username}`}
                className="flex items-center gap-[10px] min-w-0"
              >
                <Avatar artist={artwork.artist} size={40} />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <span className="font-sans font-semibold text-[14px] text-ink truncate">
                      {displayName}
                    </span>
                    {artwork.artist.is_founding_member && (
                      <Star01
                        className="w-[14px] h-[14px] text-accent shrink-0"
                        strokeWidth={2}
                        fill="currentColor"
                      />
                    )}
                  </div>
                  <span className="font-sans text-[12px] text-muted truncate">
                    @{artwork.artist.username} · {relativeTime(artwork.created_at)}
                  </span>
                </div>
              </Link>
              {isOwner ? (
                <Link
                  href={`/app/edit-art/${artwork.id}`}
                  className="shrink-0 rounded-[8px] px-[24px] h-[44px] flex items-center justify-center bg-surface border border-accent text-accent font-sans font-semibold text-[14px]"
                >
                  Edit
                </Link>
              ) : (
                <div className="shrink-0">
                  <FollowButton
                    targetUserId={artwork.artist.id}
                    targetUsername={artwork.artist.username}
                    initialFollowing={initialFollowing}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-divider/50" />

            {/* Body */}
            <div className="p-[16px] tab:p-[24px] flex flex-col gap-[14px] flex-1">
              {artwork.title && (
                <h2 className="font-serif font-bold text-[22px] tab:text-[24px] desk:text-[28px] leading-[1.2] text-ink">
                  {artwork.title}
                </h2>
              )}
              {(yearMedium || dimensions) && (
                <div className="flex flex-col gap-[2px]">
                  {yearMedium && (
                    <p className="font-sans text-[13px] text-muted">{yearMedium}</p>
                  )}
                  {dimensions && (
                    <p className="font-sans text-[13px] text-muted">{dimensions}</p>
                  )}
                </div>
              )}
              {artwork.description && (
                <p className="font-sans text-[14px] text-ink leading-[22px] whitespace-pre-wrap">
                  {artwork.description}
                </p>
              )}
            </div>

            <div className="border-t border-divider/50" />

            {/* Footer */}
            <div className="p-[16px] tab:p-[24px]">
              <p className="font-sans text-[12px] text-muted">
                Posted {formatPosted(artwork.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ artist, size }: { artist: ArtworkArtist; size: number }) {
  if (artist.avatar_url) {
    return (
      <Image
        src={artist.avatar_url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = (artist.name?.trim() || artist.username).slice(0, 2).toUpperCase();
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full bg-divider text-ink text-[12px] font-semibold flex items-center justify-center shrink-0"
    >
      {initials}
    </span>
  );
}
