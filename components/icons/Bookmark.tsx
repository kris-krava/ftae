// Custom inline Bookmark icon — Untitled UI's shipped Bookmark hardcodes
// strokeWidth=2 on its <path> (which silently overrides the prop), and it
// doesn't ship a filled variant. This wrapper exposes both `strokeWidth` and
// `filled` as real props so we can hit the Figma spec at every breakpoint.

interface BookmarkProps {
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
  'aria-hidden'?: boolean;
}

export function Bookmark({
  className,
  strokeWidth = 2,
  filled = false,
  'aria-hidden': ariaHidden = true,
}: BookmarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path
        stroke="currentColor"
        fill={filled ? 'currentColor' : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M5 7.8c0-1.6802 0-2.5202.327-3.162a3 3 0 0 1 1.311-1.311C7.2798 3 8.1198 3 9.8 3h4.4c1.6802 0 2.5202 0 3.162.327a3 3 0 0 1 1.311 1.311C19 5.2798 19 6.1198 19 7.8V21l-7-4-7 4z"
      />
    </svg>
  );
}
