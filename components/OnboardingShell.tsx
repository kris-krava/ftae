import { Wordmark } from '@/app/_components/Wordmark';
import { ProgressBar } from '@/components/ProgressBar';

interface OnboardingShellProps {
  step: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}

export function OnboardingShell({ step, children }: OnboardingShellProps) {
  return (
    <main
      className={
        'flex flex-col items-center w-full min-h-screen bg-canvas ' +
        'p-[32px] ' +
        'tab:px-[124px] tab:py-[40px] ' +
        'desk:px-[350px] desk:py-[50px]'
      }
    >
      <Wordmark variant="short" size="compact" />
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <ProgressBar step={step} total={4} />
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      {children}
    </main>
  );
}
