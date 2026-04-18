import { Wordmark } from '@/app/_components/Wordmark';
import { LandingForm } from '@/app/_components/LandingForm';
import { StatsBand } from '@/app/_components/StatsBand';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center w-full min-h-full bg-canvas">
      <section
        className={
          'w-full bg-canvas flex flex-col items-center text-center ' +
          'px-[24px] py-[48px] gap-[20px] ' +
          'tab:pt-[64px] tab:pb-[56px] tab:gap-[24px] ' +
          'desk:px-[160px] desk:pt-[80px] desk:pb-[64px] desk:gap-[28px]'
        }
      >
        <Wordmark variant="full" />
        <p
          className={
            'font-sans italic font-medium text-muted ' +
            'text-[18px] leading-[28px] ' +
            'tab:text-[20px] desk:text-[22px]'
          }
        >
          <span className="block">Trade Art You&rsquo;ve Made</span>
          <span className="block">For The Art You Love</span>
        </p>
        <span
          aria-hidden="true"
          className="block bg-accent rounded-[2px] h-[3px] w-[48px] desk:w-[56px]"
        />
        <p className="font-sans text-[15px] leading-[24px] text-ink tab:max-w-[350px] desk:max-w-[600px]">
          An artist-only community, where we trade our original artwork with each other.
        </p>
        <p className="font-sans font-bold text-[15px] leading-[24px] text-ink">
          No galleries. No buyers.
        </p>
      </section>

      <StatsBand />

      <section
        className={
          'w-full bg-canvas flex flex-col items-center text-center ' +
          'px-[24px] py-[48px] gap-[16px] ' +
          'tab:max-w-[400px] tab:pt-[64px] tab:pb-[96px] ' +
          'desk:max-w-none desk:px-[160px] desk:pt-[72px] desk:pb-[120px]'
        }
      >
        <p className="font-sans font-semibold text-[15px] leading-[24px] text-ink">
          Join before launch and get 3 months FREE!
        </p>
        <LandingForm />
        <p className="font-sans text-[13px] leading-[20px] text-muted">
          We&rsquo;ll send a magic link &mdash; no password needed.
        </p>
      </section>
    </main>
  );
}
