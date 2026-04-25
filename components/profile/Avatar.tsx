import Image from 'next/image';
import { focalToObjectPosition } from '@/lib/focal-point';

interface AvatarProps {
  initials: string;
  avatarUrl: string | null;
  size: number;
  className?: string;
  textSize?: string;
  priority?: boolean;
  /** 0..1 horizontal focal point in the original image; defaults to center. */
  focalX?: number;
  /** 0..1 vertical focal point in the original image; defaults to center. */
  focalY?: number;
  /** width / height of the original image. When present, the focal is mapped
   *  through focalToObjectPosition so the chosen point sits in the visible
   *  square. When absent, falls back to center. */
  aspectRatio?: number | null;
}

export function Avatar({
  initials,
  avatarUrl,
  size,
  className,
  textSize,
  priority,
  focalX = 0.5,
  focalY = 0.5,
  aspectRatio,
}: AvatarProps) {
  const baseClass = `rounded-full overflow-hidden shrink-0 bg-divider ${className ?? ''}`;
  if (avatarUrl) {
    const pos = aspectRatio
      ? focalToObjectPosition(aspectRatio, { x: focalX, y: focalY })
      : { x: 50, y: 50 };
    return (
      <div className={baseClass} style={{ width: size, height: size }}>
        <Image
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          priority={priority}
          className="w-full h-full object-cover"
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        />
      </div>
    );
  }
  return (
    <div
      className={`${baseClass} flex items-center justify-center text-ink font-semibold ${textSize ?? 'text-[24px]'}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
