import { OnboardingShell } from '@/components/OnboardingShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { requireOnboardingUser } from '@/app/_lib/onboarding';
import { Step1Form } from './Step1Form';

export default async function Step1Page() {
  const { profile } = await requireOnboardingUser();

  return (
    <OnboardingShell step={1}>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full ' +
          'text-[28px] leading-[36px] ' +
          'desk:text-[40px] desk:leading-[50px]'
        }
      >
        Your profile
      </h1>
      <span aria-hidden className="h-[36px] w-px shrink-0" />
      <ErrorBoundary label="onboarding-step-1">
        <Step1Form
          initialName={profile.name ?? ''}
          initialLocation={profile.location_city ?? ''}
          initialAvatarUrl={profile.avatar_url ?? null}
          initialUsername={profile.username ?? ''}
        />
      </ErrorBoundary>
    </OnboardingShell>
  );
}
