'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XClose } from '@/components/icons';
import { focalToObjectPosition, tapToFocal, type FocalPoint } from '@/lib/focal-point';

const FOCAL_SETTLE_MS = 250;
const FOCAL_TRANSITION_MS = 300;

export const PHOTO_TILE_BASIS =
  'basis-[calc((100%-8px)/2)] tab:basis-[calc((100%-16px)/3)]';

interface SortablePhotoProps {
  id: string;
  src: string;
  index: number;
  focal: FocalPoint;
  onRemove: () => void;
  onSetFocal: (f: FocalPoint) => void;
}

export function SortablePhoto({ id, src, index, focal, onRemove, onSetFocal }: SortablePhotoProps) {
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

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
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

  return (
    <div
      ref={setNodeRef}
      style={tileStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`${PHOTO_TILE_BASIS} shrink-0 relative aspect-square rounded-[8px] overflow-hidden bg-divider touch-none ${panAvailable ? 'cursor-pointer' : ''} ${isDragging ? 'opacity-80 shadow-modal' : ''}`}
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
      {panAvailable && (
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
        aria-label={`Remove photo ${index + 1}`}
        className="absolute top-[6px] right-[6px] w-[24px] h-[24px] rounded-full bg-ink/60 flex items-center justify-center"
      >
        <XClose className="w-[14px] h-[14px] text-surface" strokeWidth={1.25} />
      </button>
    </div>
  );
}
