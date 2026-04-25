'use client';

import { useEffect, useRef, useState } from 'react';
import { focalToObjectPosition, tapToFocal, type FocalPoint } from '@/lib/focal-point';

// Circular focal-point picker for avatars. Reuses the same math and
// settle-dot interaction as components/art-form/SortablePhoto.tsx — only
// the visual chrome differs (circle instead of rounded square, no drag-
// sort, no remove button).
//
// The user taps inside the cropped circle to indicate where the focal
// should be. A dot animates from the tap location back to center as the
// image re-positions to put their tap at the center of the circle.

const FOCAL_SETTLE_MS = 250;
const FOCAL_TRANSITION_MS = 300;

interface AvatarEditorProps {
  src: string;
  size?: number;
  focal: FocalPoint;
  onSetFocal: (f: FocalPoint) => void;
}

export function AvatarEditor({ src, size = 200, focal, onSetFocal }: AvatarEditorProps) {
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

  // Square images have no slack — clicking won't change anything. Skip the
  // pointer affordances so the UI doesn't hint at interactivity that won't
  // do anything.
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

  return (
    <div
      onClick={handleClick}
      style={{ width: size, height: size }}
      className={`relative rounded-full overflow-hidden bg-divider ${panAvailable ? 'cursor-pointer' : ''}`}
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
    </div>
  );
}
