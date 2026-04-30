import { Wordmark } from '@/app/_components/Wordmark';
import { ProgressBar } from '@/components/ProgressBar';

interface OnboardingShellProps {
  step: 1 | 2 | 3;
  children: React.ReactNode;
}

// Content stays at fixed widths within each breakpoint (mobile 326 / tablet 520 /
// desktop 580). max-width on the inner column keeps it from scaling with the
// viewport — at 1440 or 1920 desktop, content is still 580.
export function OnboardingShell({ step, children }: OnboardingShellProps) {
  return (
    <main
      className={
        'flex flex-col items-center w-full min-h-screen bg-canvas ' +
        'px-[32px] py-[32px] tab:py-[40px] desk:py-[50px]'
      }
    >
      <div
        className={
          'flex flex-col items-center w-full ' +
          'max-w-[326px] tab:max-w-[520px] desk:max-w-[580px]'
        }
      >
        <Wordmark variant="full" size="compact" />
        <span aria-hidden className="h-[24px] w-px shrink-0" />
        <ProgressBar step={step} total={3} />
        <span aria-hidden className="h-[32px] w-px shrink-0" />
        {children}
      </div>
    </main>
  );
}
