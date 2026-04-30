'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XClose } from '@/components/icons';
import { ArcSpinner } from '@/components/ArcSpinner';
import { focalToObjectPosition, tapToFocal, type FocalPoint } from '@/lib/focal-point';

const FOCAL_SETTLE_MS = 250;
const FOCAL_TRANSITION_MS = 300;

export const PHOTO_TILE_BASIS =
  'basis-[calc((100%-8px)/2)] tab:basis-[calc((100%-16px)/3)]';

export type PhotoTileState = 'ready' | 'uploading' | 'failed' | 'committing';

interface SortablePhotoProps {
  id: string;
  src: string;
  index: number;
  focal: FocalPoint;
  onRemove: () => void;
  onSetFocal: (f: FocalPoint) => void;
  /** Visual state. `ready` = no overlay, normal interactions.
   *  `uploading` = ArcSpinner overlay, focal taps disabled, remove enabled (will abort).
   *  `failed` = error overlay; remove always shown; retry shown only when onRetry is given.
   *  `committing` = ArcSpinner overlay, all interactions disabled (parent is mid-save). */
  state?: PhotoTileState;
  /** When state='failed' and a retry is possible, parent provides this. */
  onRetry?: () => void;
}

export function SortablePhoto({
  id,
  src,
  index,
  focal,
  onRemove,
  onSetFocal,
  state = 'ready',
  onRetry,
}: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const [dotReturning, setDotReturning] = useState(false);
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  useEffect(
    () => () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    },
    [],
  );

  const objectPos = natural
    ? focalToObjectPosition(natural.w / natural.h, focal)
    : { x: 50, y: 50 };

  const panAvailable = natural ? natural.w !== natural.h : false;
  const interactive = state === 'ready';

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive) return;
    if (!natural || !panAvailable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tx = e.clientX - rect.left;
    const ty = e.clientY - rect.top;
    setDotReturning(false);
    setDot({ x: (tx / rect.width) * 100, y: (ty / rect.height) * 100 });
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const next = tapToFocal(tx, ty, rect.width, natural.w, natural.h, focal);
      onSetFocal(next);
      setDotReturning(true);
      setDot(null);
    }, FOCAL_SETTLE_MS);
  }

  const dotStyle: React.CSSProperties = {
    left: dot ? `${dot.x}%` : '50%',
    top: dot ? `${dot.y}%` : '50%',
    transition: dotReturning ? `left ${FOCAL_TRANSITION_MS}ms, top ${FOCAL_TRANSITION_MS}ms` : 'none',
  };

  const tileStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const removeDisabled = state === 'committing';
  const showSpinner = state === 'uploading' || state === 'committing';
  const showFailed = state === 'failed';

  return (
    <div
      ref={setNodeRef}
      style={tileStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`${PHOTO_TILE_BASIS} shrink-0 relative aspect-square rounded-[8px] overflow-hidden bg-divider touch-none ${interactive && panAvailable ? 'cursor-pointer' : ''} ${isDragging ? 'opacity-80 shadow-modal' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          objectPosition: `${objectPos.x}% ${objectPos.y}%`,
          transition: `object-position ${FOCAL_TRANSITION_MS}ms`,
        }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      {interactive && panAvailable && (
        <span
          aria-hidden
          style={dotStyle}
          className="absolute w-[10px] h-[10px] rounded-full bg-surface border border-ink/50 -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={removeDisabled}
        aria-label={`Remove photo ${index + 1}`}
        className="absolute top-[6px] right-[6px] w-[24px] h-[24px] rounded-full bg-ink/60 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed z-10"
      >
        <XClose className="w-[14px] h-[14px] text-surface" strokeWidth={1.25} />
      </button>
      {showSpinner && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-ink/40 flex items-center justify-center pointer-events-none"
        >
          <ArcSpinner size={24} className="text-accent" />
        </div>
      )}
      {showFailed && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-ink/55 flex items-center justify-center"
        >
          {onRetry ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Retry upload for photo ${index + 1}`}
              className="w-[40px] h-[40px] rounded-full bg-surface flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-[20px] h-[20px] text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-3.5-7.1" />
                <path d="M21 4v5h-5" />
              </svg>
            </button>
          ) : (
            <span className="font-sans text-[12px] leading-[16px] text-surface text-center px-[8px]">
              Couldn&apos;t process
            </span>
          )}
        </div>
      )}
    </div>
  );
}
