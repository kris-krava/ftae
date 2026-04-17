interface WordmarkProps {
  variant: 'full' | 'short';
  size?: 'hero' | 'compact';
  className?: string;
}

const HERO_CLASS =
  'font-script text-ink text-center tracking-[-0.5px] ' +
  'text-[34px] leading-[42px] ' +
  'tab:text-[44px] tab:leading-[52px] ' +
  'desk:text-[56px] desk:leading-[64px]';

const COMPACT_CLASS =
  'font-script text-ink text-center tracking-[-0.5px] ' +
  'text-[24px] leading-[42px] ' +
  'tab:text-[26px] tab:leading-[46px] ' +
  'desk:text-[28px] desk:leading-[50px]';

export function Wordmark({ variant, size = 'hero', className }: WordmarkProps) {
  const base = size === 'compact' ? COMPACT_CLASS : HERO_CLASS;

  if (variant === 'short') {
    return <p className={`${base} ${className ?? ''}`}>FTAE</p>;
  }

  return (
    <p className={`${base} ${className ?? ''}`}>
      <span className="block desk:inline">Free Trade</span>{' '}
      <span className="block desk:inline">Art Exchange</span>
    </p>
  );
}
