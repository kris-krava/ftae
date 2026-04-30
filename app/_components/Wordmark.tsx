interface WordmarkProps {
  variant: 'full' | 'short';
  size?: 'hero' | 'compact';
  className?: string;
}

// Per the Figma wrap rule (2026-04-22), the full hero wordmark has no hard
// break — container width drives the natural wrap. 310/400/520 produce the
// canonical "Free Trade / Art Exchange" two-line layout at hero sizes.
const HERO_FULL_CLASS =
  'font-script text-ink text-center tracking-[-0.5px] mx-auto ' +
  'w-[310px] text-[34px] leading-[42px] ' +
  'tab:w-[400px] tab:text-[44px] tab:leading-[52px] ' +
  'desk:w-[520px] desk:text-[56px] desk:leading-[64px]';

const HERO_SHORT_CLASS =
  'font-script text-ink text-center tracking-[-0.5px] ' +
  'text-[34px] leading-[42px] ' +
  'tab:text-[44px] tab:leading-[52px] ' +
  'desk:text-[56px] desk:leading-[64px]';

// Compact + short ("FTAE") — used by LegalShell.
const COMPACT_SHORT_CLASS =
  'font-script text-ink text-center tracking-[-0.5px] ' +
  'text-[24px] leading-[42px] ' +
  'tab:text-[26px] tab:leading-[46px] ' +
  'desk:text-[28px] desk:leading-[50px]';

// Compact + full ("Free Trade Art Exchange") — used by OnboardingShell.
// Mobile reduced to 21pt so the full string fits the 326-column without
// wrapping. Tablet/desktop unchanged.
const COMPACT_FULL_CLASS =
  'font-script text-ink text-center tracking-[-0.5px] ' +
  'text-[21px] leading-[37px] ' +
  'tab:text-[26px] tab:leading-[46px] ' +
  'desk:text-[28px] desk:leading-[50px]';

export function Wordmark({ variant, size = 'hero', className }: WordmarkProps) {
  if (size === 'compact') {
    if (variant === 'short') {
      return <p className={`${COMPACT_SHORT_CLASS} ${className ?? ''}`}>FTAE</p>;
    }
    return <p className={`${COMPACT_FULL_CLASS} ${className ?? ''}`}>Free Trade Art Exchange</p>;
  }

  if (variant === 'short') {
    return <p className={`${HERO_SHORT_CLASS} ${className ?? ''}`}>FTAE</p>;
  }

  return <p className={`${HERO_FULL_CLASS} ${className ?? ''}`}>Free Trade Art Exchange</p>;
}
