import { OnboardingShell } from '@/components/OnboardingShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { requireOnboardingUser, getMediums, getUserMediumIds } from '@/app/_lib/onboarding';
import { Step2Form } from './Step2Form';

export const dynamic = 'force-dynamic';

export default async function Step2Page() {
  const { userId, profile } = await requireOnboardingUser();
  const [mediums, selectedIds] = await Promise.all([getMediums(), getUserMediumIds(userId)]);

  return (
    <OnboardingShell step={2}>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full ' +
          'text-[28px] leading-[36px] ' +
          'desk:text-[40px] desk:leading-[50px]'
        }
      >
        Your practice
      </h1>
      <span aria-hidden className="h-[60px] w-px shrink-0" />
      <ErrorBoundary label="onboarding-step-2">
        <Step2Form
          mediums={mediums}
          initialSelectedIds={selectedIds}
          initialBio={profile.bio ?? ''}
        />
      </ErrorBoundary>
    </OnboardingShell>
  );
}
