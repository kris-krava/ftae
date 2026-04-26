// 18x18 brand badge for the Step 3 social field. Each platform renders its
// real brand glyph in white on a brand-color background — mirrors the
// figma design at node 186:1379.
//
// `PlatformIcon` (exported below) renders the same glyphs at any size with
// currentColor — used inline in the profile header next to the @handle.

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

interface PlatformIconProps {
  platform: string;
  /** Tailwind utility classes for sizing + color, e.g. "w-[14px] h-[14px] text-muted". */
  className?: string;
}

function Glyph({ platform, className }: { platform: string; className: string }) {
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M14 8h2.5V5h-2.5C12 5 10.5 6.5 10.5 8.5V11H8v3h2.5v6h3v-6H16l.5-3H13.5V8.5C13.5 8.2 13.7 8 14 8z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M17.5 4h2.6l-5.7 6.5L21 20h-5.2l-4.1-5.4L7 20H4.4l6.1-7L4 4h5.3l3.7 4.9L17.5 4z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M16 3v3a4 4 0 0 0 4 4v3a7 7 0 0 1-4-1.3V16a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V3h3z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M10 9v6l5-3-5-3z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 3a8 8 0 0 0-2.9 15.4c-.1-.7-.2-1.7 0-2.5l1-4.4s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.7 0 1.1.6 1.1 1.2 0 .8-.5 1.9-.7 2.9-.2.9.4 1.6 1.3 1.6 1.6 0 2.7-2 2.7-4.4 0-1.8-1.2-3.2-3.5-3.2-2.5 0-4.1 1.9-4.1 4 0 .7.2 1.3.5 1.6.1.1.1.2.1.4l-.2.7c-.1.2-.2.3-.4.2-1.1-.5-1.8-2.1-1.8-3.4 0-2.7 2-5.2 5.6-5.2 3 0 5.2 2.1 5.2 4.9 0 2.9-1.8 5.2-4.4 5.2-.9 0-1.7-.5-1.9-1l-.5 2c-.2.7-.7 1.6-1 2.1A8 8 0 1 0 12 3z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm1 13H4V9h2v11zm14 0h-2v-5.4c0-1.4-.5-2.1-1.6-2.1-.9 0-1.4.6-1.6 1.2-.1.2-.1.5-.1.8V20h-2V9h2v1.4c.4-.6 1.1-1.5 2.7-1.5 2 0 3.6 1.3 3.6 4V20z" />
        </svg>
      );
    default:
      return null;
  }
}

const BG: Record<string, string> = {
  instagram: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
  facebook: '#1877f2',
  x: '#000000',
  tiktok: '#000000',
  youtube: '#ff0000',
  pinterest: '#e60023',
  linkedin: '#0a66c2',
};

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const bg = BG[platform];
  if (!bg) return null;
  return (
    <span
      aria-hidden
      className={
        'shrink-0 inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] ' +
        (className ?? '')
      }
      style={{ background: bg }}
    >
      <Glyph platform={platform} className="w-[11px] h-[11px] text-surface" />
    </span>
  );
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  if (!BG[platform]) return null;
  return <Glyph platform={platform} className={className ?? 'w-[14px] h-[14px]'} />;
}
