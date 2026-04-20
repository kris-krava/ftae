interface ProgressBarProps {
  step: 1 | 2 | 3;
  total: 3;
}

export function ProgressBar({ step, total }: ProgressBarProps) {
  return (
    <div className="flex flex-col gap-[8px] items-center w-full">
      <p className="font-sans font-medium text-[11px] leading-[16px] text-muted text-center tracking-[1.5px] w-full">
        STEP {step} OF {total}
      </p>
      <div className="flex gap-[6px] h-[3px] w-full">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 min-w-px h-full rounded-[2px] ${i < step ? 'bg-accent' : 'bg-divider'}`}
          />
        ))}
      </div>
    </div>
  );
}
