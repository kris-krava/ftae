import Image from 'next/image';

interface AvatarProps {
  initials: string;
  avatarUrl: string | null;
  size: number;
  className?: string;
  textSize?: string;
  priority?: boolean;
}

export function Avatar({ initials, avatarUrl, size, className, textSize, priority }: AvatarProps) {
  const baseClass = `rounded-full overflow-hidden shrink-0 bg-divider ${className ?? ''}`;
  if (avatarUrl) {
    return (
      <div className={baseClass} style={{ width: size, height: size }}>
        <Image
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          priority={priority}
          className="w-full h-full object-cover"
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
