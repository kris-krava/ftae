// Small 18x18 brand-color badge that sits inside the Step 3 social field
// platform selector. Mirrors the gradient Instagram icon from Figma node
// 186:1379 — uses each platform's primary brand color so the user can see
// at a glance which network they're attaching.

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

const STYLES: Record<string, { bg: string; symbol: string; color: string }> = {
  instagram: {
    bg: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
    symbol: '◉',
    color: '#ffffff',
  },
  facebook:  { bg: '#1877f2', symbol: 'f',  color: '#ffffff' },
  x:         { bg: '#000000', symbol: '𝕏',  color: '#ffffff' },
  tiktok:    { bg: '#000000', symbol: 'T',  color: '#ffffff' },
  youtube:   { bg: '#ff0000', symbol: '▶',  color: '#ffffff' },
  pinterest: { bg: '#e60023', symbol: 'P',  color: '#ffffff' },
  linkedin:  { bg: '#0a66c2', symbol: 'in', color: '#ffffff' },
};

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const s = STYLES[platform];
  if (!s) return null;
  return (
    <span
      aria-hidden
      className={
        'shrink-0 inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] ' +
        'font-sans font-bold text-[11px] leading-none ' +
        (className ?? '')
      }
      style={{ background: s.bg, color: s.color }}
    >
      {s.symbol}
    </span>
  );
}
