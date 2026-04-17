import { OnboardingShell } from '@/components/OnboardingShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { requireOnboardingUser } from '@/app/_lib/onboarding';
import { Step3Form } from './Step3Form';

export const dynamic = 'force-dynamic';

export default async function Step3Page() {
  const { profile } = await requireOnboardingUser();

  return (
    <OnboardingShell step={3}>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full ' +
          'text-[28px] leading-[36px] ' +
          'desk:text-[40px] desk:leading-[50px]'
        }
      >
        Add your links?
      </h1>
      <span aria-hidden className="h-[42px] w-px shrink-0" />
      <ErrorBoundary label="onboarding-step-3">
        <Step3Form
          initialWebsite={profile.website_url ?? ''}
          initialPlatform={profile.social_platform ?? ''}
          initialHandle={profile.social_handle ?? ''}
        />
      </ErrorBoundary>
    </OnboardingShell>
  );
}
