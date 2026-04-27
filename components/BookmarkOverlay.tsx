'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from '@/components/icons';
import { toggleBookmark } from '@/app/_actions/bookmarks';
import { emitBookmarkToggled } from '@/lib/artwork-events';

interface BookmarkOverlayProps {
  artworkId: string;
  initialBookmarked: boolean;
  isAuthenticated: boolean;
  /** Extra classes — typically positioning ("absolute top-[12px] right-[12px]"). */
  className?: string;
  /** Optional callback after a confirmed server result. Used by Trades page
   * to remove a piece from a bucket on unsave without round-tripping. */
  onChange?: (bookmarked: boolean) => void;
}

export function BookmarkOverlay({
  artworkId,
  initialBookmarked,
  isAuthenticated,
  className,
  onChange,
}: BookmarkOverlayProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    const next = !bookmarked;
    setBookmarked(next);
    // Emit synchronously, before awaiting the server, so listeners (e.g. the
    // Trades page) update even if this component unmounts mid-flight (closing
    // the parent modal abandons the post-await branch). On server failure we
    // emit a corrective event and let any listener choose to reconcile via a
    // refresh.
    emitBookmarkToggled(artworkId, next);
    start(async () => {
      const result = await toggleBookmark(artworkId);
      if (!result.ok || result.bookmarked !== next) {
        setBookmarked((prev) => !prev);
        emitBookmarkToggled(artworkId, !next);
        return;
      }
      onChange?.(next);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove from saved' : 'Save for trade'}
      className={
        'w-[24px] h-[24px] flex items-center justify-center text-accent ' +
        (className ?? '')
      }
    >
      <Bookmark className="w-[24px] h-[24px]" filled={bookmarked} />
    </button>
  );
}
