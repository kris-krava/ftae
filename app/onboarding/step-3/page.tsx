import { OnboardingShell } from '@/components/OnboardingShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { requireOnboardingUser } from '@/app/_lib/onboarding';
import { Step3Form } from './Step3Form';

// Allow up to 60s for saveStep4Artwork — six photos uploaded sequentially-in-
// parallel to Supabase Storage from a Vercel function can exceed the default
// 15s window on slower uplinks or when the function lands in a region distant
// from the Storage bucket.
export const maxDuration = 60;

export default async function Step3Page() {
  await requireOnboardingUser();

  return (
    <OnboardingShell step={3}>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full ' +
          'text-[28px] leading-[36px] ' +
          'tab:text-[34px] tab:leading-[44px] ' +
          'desk:text-[38px] desk:leading-[50px]'
        }
      >
        Your art
      </h1>
      <span aria-hidden className="h-[12px] w-px shrink-0" />
      <p
        className={
          'font-sans text-muted text-center mx-auto ' +
          'text-[14px] leading-[22px] max-w-[326px] ' +
          'tab:text-[15px] tab:leading-[23px] tab:max-w-[388px] ' +
          'desk:text-[16px] desk:leading-[24px] desk:max-w-[480px]'
        }
      >
        Complete your profile - add one piece you made, and would love another artist to have.
      </p>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <ErrorBoundary label="onboarding-step-3">
        <Step3Form />
      </ErrorBoundary>
    </OnboardingShell>
  );
}
