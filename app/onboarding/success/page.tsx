import Image from 'next/image';
import { requireOnboardingUser } from '@/app/_lib/onboarding';
import { SuccessTransition } from './SuccessTransition';

const REDIRECT_DELAY_MS = 3200;

export default async function SuccessPage() {
  await requireOnboardingUser();

  return (
    <main
      className={
        'flex flex-col items-center justify-center w-full min-h-screen bg-canvas ' +
        'gap-[40px] px-[32px] ' +
        'tab:px-[120px] ' +
        'desk:px-[320px]'
      }
    >
      <div
        className={
          'shrink-0 w-[260px] h-[260px] paint-burst-in ' +
          'tab:w-[260px] tab:h-[260px]'
        }
      >
        <Image
          src="/images/paint-burst.svg"
          alt=""
          width={260}
          height={260}
          priority
          className="w-full h-full"
        />
      </div>
      <h1
        className={
          'font-serif font-bold text-ink text-center w-full text-balance-fallback ' +
          'text-[36px] leading-[46px] ' +
          'tab:text-[44px] tab:leading-[56px] ' +
          'desk:text-[56px] desk:leading-[68px]'
        }
      >
        You&rsquo;re a founding artist!
      </h1>
      <SuccessTransition delayMs={REDIRECT_DELAY_MS} target="/app/home" />
    </main>
  );
}
