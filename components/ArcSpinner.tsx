interface ArcSpinnerProps {
  /** Diameter in pixels. */
  size?: number;
  /** Tailwind classes — typically a text-color utility for the arc. */
  className?: string;
  'aria-label'?: string;
}

// Single canonical spinner across the app: faint background ring + 90° arc that
// rotates. Color is driven by `currentColor`, so callers control via text-*.
export function ArcSpinner({
  size = 24,
  className = 'text-accent',
  'aria-label': ariaLabel,
}: ArcSpinnerProps) {
  return (
    <svg
      role={ariaLabel ? 'status' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
