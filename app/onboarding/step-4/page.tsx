import { OnboardingShell } from '@/components/OnboardingShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { requireOnboardingUser } from '@/app/_lib/onboarding';
import { Step4Form } from './Step4Form';

export const dynamic = 'force-dynamic';

export default async function Step4Page() {
  await requireOnboardingUser();

  return (
    <OnboardingShell step={4}>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full ' +
          'text-[28px] leading-[36px] ' +
          'desk:text-[40px] desk:leading-[50px]'
        }
      >
        Add your art, something you made and would be happy to trade.
      </h1>
      <span aria-hidden className="h-[60px] w-px shrink-0" />
      <ErrorBoundary label="onboarding-step-4">
        <Step4Form />
      </ErrorBoundary>
    </OnboardingShell>
  );
}
