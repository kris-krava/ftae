import { Wordmark } from '@/app/_components/Wordmark';
import { LandingForm } from '@/app/_components/LandingForm';
import { getLandingStats } from '@/app/_lib/landing-stats';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const stats = await getLandingStats();

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

      <section
        className={
          'w-full bg-ink flex flex-col items-center ' +
          'px-[24px] py-[48px] ' +
          'tab:pt-[56px] tab:pb-[72px] tab:gap-[32px] ' +
          'desk:px-[160px] desk:pt-[64px] desk:pb-[80px] desk:gap-[40px]'
        }
      >
        <p className="font-sans font-medium text-[11px] tracking-[2px] text-canvas text-center w-full">
          PREPARING FOR LAUNCH
        </p>

        {/* Mobile: vertical stack with horizontal dividers */}
        <div className="flex flex-col w-full mt-[32px] tab:hidden">
          <StatTile value={stats.foundingArtists} label="Founding Artists" />
          <span aria-hidden="true" className="self-center bg-divider h-px w-[326px]" />
          <StatTile value={stats.piecesToTrade} label="Pieces to Trade" />
          <span aria-hidden="true" className="self-center bg-divider h-px w-[326px]" />
          <StatTile value={stats.daysUntilLaunch} label="Days Until Launch" />
        </div>

        {/* Tablet & Desktop: horizontal row with vertical dividers */}
        <div className="hidden tab:flex bg-canvas items-center w-full">
          <StatTile value={stats.foundingArtists} label="Founding Artists" />
          <span aria-hidden="true" className="bg-divider w-px h-[88px] desk:h-[100px]" />
          <StatTile value={stats.piecesToTrade} label="Pieces to Trade" />
          <span aria-hidden="true" className="bg-divider w-px h-[88px] desk:h-[100px]" />
          <StatTile value={stats.daysUntilLaunch} label="Days Until Launch" />
        </div>
      </section>

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

function StatTile({ value, label }: { value: number | null; label: string }) {
  const display = value === null ? '\u2014' : value.toLocaleString('en-US');
  return (
    <div
      className={
        'flex-1 min-w-0 bg-muted text-canvas text-center whitespace-nowrap ' +
        'flex flex-col items-center justify-center ' +
        'px-[16px] py-[24px] gap-[8px] ' +
        'tab:px-[16px] tab:py-[32px] ' +
        'desk:px-[24px] desk:py-[32px] desk:gap-[10px]'
      }
    >
      <span
        className={
          'font-sans font-extrabold tracking-[-1.5px] ' +
          'text-[56px] leading-[64px] ' +
          'tab:text-[64px] tab:leading-[72px] ' +
          'desk:text-[80px] desk:leading-[88px] desk:tracking-[-2px]'
        }
      >
        {display}
      </span>
      <span className="font-sans font-medium text-[14px] leading-[20px] desk:text-[15px] desk:leading-[22px]">
        {label}
      </span>
    </div>
  );
}
