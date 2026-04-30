import { OnboardingShell } from '@/components/OnboardingShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { requireOnboardingUser } from '@/app/_lib/onboarding';
import { Step3Form } from './Step3Form';

export default async function Step3Page() {
  await requireOnboardingUser();

  return (
    <OnboardingShell step={3}>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full ' +
          'text-[28px] leading-[36px] ' +
          'desk:text-[38px] desk:leading-[50px]'
        }
      >
        Your art
      </h1>
      <span aria-hidden className="h-[12px] w-px shrink-0" />
      <p
        className={
          'font-sans text-[16px] leading-[24px] text-muted text-center w-full ' +
          'desk:max-w-[480px] desk:mx-auto'
        }
      >
        Add one piece you&apos;ve made, that you&apos;d happily trade for art you love. You&apos;ll choose the trade that&apos;s right for you.
      </p>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <ErrorBoundary label="onboarding-step-3">
        <Step3Form />
      </ErrorBoundary>
    </OnboardingShell>
  );
}
