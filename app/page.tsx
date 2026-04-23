import Link from 'next/link';
import { XClose } from '@/components/icons';
import { Wordmark } from '@/app/_components/Wordmark';
import { LandingForm } from '@/app/_components/LandingForm';
import { StatsBand } from '@/app/_components/StatsBand';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center w-full min-h-full bg-canvas">
      <HeroSection />
      <StatsBand />
      <CTASection />
      <PricingSection />
      <KravaSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section
      className={
        'w-full bg-canvas flex flex-col items-center text-center gap-[48px] ' +
        'py-[48px] ' +
        'tab:py-[64px] ' +
        'desk:py-[80px]'
      }
    >
      <div className="w-full flex justify-center px-[24px] tab:px-[124px] desk:px-[350px]">
        <Wordmark variant="full" />
      </div>

      <div className="w-full bg-accent flex items-center justify-center gap-[4px] py-[12px] tab:py-[12px] desk:py-[16px]">
        <span
          className={
            'flex-1 text-right uppercase font-sans font-bold text-canvas ' +
            'text-[17px] leading-[28px] ' +
            'tab:text-[20px] tab:leading-[32px] ' +
            'desk:text-[24px] desk:leading-[36px]'
          }
        >
          Art you made
        </span>
        <XClose className="shrink-0 w-[16px] h-[16px] tab:w-[20px] tab:h-[20px] desk:w-[20px] desk:h-[20px] text-canvas" />
        <span
          className={
            'flex-1 text-left uppercase font-sans font-bold text-canvas ' +
            'text-[17px] leading-[28px] ' +
            'tab:text-[20px] tab:leading-[32px] ' +
            'desk:text-[24px] desk:leading-[36px]'
          }
        >
          art you love
        </span>
      </div>

      <div
        className={
          'flex flex-col items-center gap-[20px] ' +
          'px-[24px] ' +
          'tab:px-[124px] tab:gap-[22px] ' +
          'desk:px-[350px] desk:gap-[24px]'
        }
      >
        <p
          className={
            'font-sans font-bold text-ink ' +
            'text-[17px] leading-[26px] ' +
            'tab:text-[20px] tab:leading-[30px] ' +
            'desk:text-[22px] desk:leading-[32px]'
          }
        >
          Are you like me?
        </p>
        <p
          className={
            'font-sans text-ink ' +
            'text-[15px] leading-[24px] ' +
            'tab:text-[16px] tab:leading-[26px] ' +
            'desk:text-[17px] desk:leading-[28px]'
          }
        >
          You&rsquo;ve made a ton of art. Sold a lot, or a little. Still plenty more stacked in the studio.
        </p>
        <p
          className={
            'font-sans font-bold text-ink ' +
            'text-[17px] leading-[26px] ' +
            'tab:text-[20px] tab:leading-[30px] ' +
            'desk:text-[22px] desk:leading-[32px]'
          }
        >
          Happy to trade art with artists!
        </p>
        <p
          className={
            'font-sans text-ink ' +
            'text-[15px] leading-[24px] ' +
            'tab:text-[16px] tab:leading-[26px] ' +
            'desk:text-[17px] desk:leading-[28px]'
          }
        >
          It can be awkward asking artists to trade, even close friends. I created this space as
          a place where we could see and trade our original artwork with each other.
        </p>
        <p
          className={
            'font-sans font-bold text-ink whitespace-pre-line ' +
            'text-[17px] leading-[26px] ' +
            'tab:text-[20px] tab:leading-[30px] ' +
            'desk:text-[22px] desk:leading-[32px]'
          }
        >
          {'No buyers. No Sellers.\nArtists trading with artists ONLY!'}
        </p>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section
      className={
        'w-full bg-canvas flex flex-col items-center text-center gap-[16px] ' +
        'px-[24px] py-[48px] ' +
        'tab:px-[124px] tab:py-[64px] tab:gap-[20px] ' +
        'desk:px-[350px] desk:py-[80px]'
      }
    >
      <p
        className={
          'font-sans font-semibold text-ink ' +
          'text-[15px] leading-[24px] ' +
          'tab:text-[16px] tab:leading-[26px] ' +
          'desk:text-[17px] desk:leading-[28px]'
        }
      >
        Join now and get 3 months free!
      </p>
      <LandingForm checkboxAlign="center" />
      <p className="font-sans text-[13px] leading-[20px] text-muted tab:text-[14px] tab:leading-[22px]">
        I&rsquo;ll send you a magic link &mdash; no password needed.
      </p>
      <Link
        href="mailto:help@freetradeartexchange.com"
        className="font-sans text-accent text-[15px] leading-[26px] tab:text-[16px] tab:leading-[26px] desk:text-[17px] desk:leading-[28px]"
      >
        help@freetradeartexchange.com
      </Link>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      className={
        'w-full bg-divider flex flex-col items-center text-center gap-[20px] ' +
        'px-[24px] py-[48px] ' +
        'tab:px-[124px] tab:py-[64px] tab:gap-[22px] ' +
        'desk:px-[350px] desk:py-[80px]'
      }
    >
      <h2
        className={
          'font-sans font-bold text-ink ' +
          'text-[17px] leading-[28px] ' +
          'tab:text-[20px] tab:leading-[30px] ' +
          'desk:text-[22px] desk:leading-[32px]'
        }
      >
        PRICING*
      </h2>
      <p
        className={
          'font-sans font-bold text-ink ' +
          'text-[15px] leading-[24px] ' +
          'tab:text-[16px] tab:leading-[26px] ' +
          'desk:text-[17px] desk:leading-[28px]'
        }
      >
        Thinking $10 per month, but each successful trade will waive your next month&rsquo;s fee.
      </p>
      <h3
        className={
          'font-sans font-bold text-ink ' +
          'text-[17px] leading-[28px] ' +
          'tab:text-[20px] tab:leading-[30px] ' +
          'desk:text-[22px] desk:leading-[32px]'
        }
      >
        NO CAP
      </h3>
      <p
        className={
          'font-sans italic font-medium text-muted ' +
          'text-[13px] leading-[20px] ' +
          'tab:text-[14px] tab:leading-[22px] ' +
          'desk:text-[15px] desk:leading-[24px]'
        }
      >
        *This may have to change. I&rsquo;m still doing the math, but hope this &ldquo;reverse
        churn&rdquo; financial model I came up with will work. I&rsquo;m not trying to get rich
        with this thing, just want to do something cool with y&rsquo;all.
      </p>
    </section>
  );
}

function KravaSection() {
  return (
    <section
      className={
        'w-full bg-accent flex flex-col items-center text-center gap-[20px] ' +
        'px-[24px] py-[48px] ' +
        'tab:px-[124px] tab:py-[64px] tab:gap-[22px] ' +
        'desk:px-[350px] desk:py-[80px]'
      }
    >
      <h2
        className={
          'font-sans font-bold text-canvas ' +
          'text-[17px] leading-[28px] ' +
          'tab:text-[20px] tab:leading-[30px] ' +
          'desk:text-[22px] desk:leading-[32px]'
        }
      >
        Who Is Kris Krava?
      </h2>
      <p className={kravaBody}>
        I&rsquo;m an artist and designer. Been drawing and painting my whole life. And I&rsquo;ve
        been designing apps and websites for 30yrs.
      </p>
      <p className={kravaBody}>
        In May 2026, I was driving to Lake City, SC to delivery my painting for Artfields. On that
        5hr drive from Atlanta, I had an idea.
      </p>
      <p className={kravaItalic}>What if there was a way to help artists trade art?</p>
      <p className={kravaBody}>
        I spent that entire drive dictating to my phone, asking Claude to document the concept. I
        then decided to ONLY use Claude Code to design and develop Free Trade Art Exchange.
      </p>
      <p className={kravaBody}>
        Over the past couple weeks, I&rsquo;ve been working on it. The pre-launch version is ready,
        you&rsquo;re looking at it! I hope you join, add your art, and share with friends!
      </p>
    </section>
  );
}

const kravaBody =
  'font-sans text-canvas ' +
  'text-[15px] leading-[24px] ' +
  'tab:text-[16px] tab:leading-[26px] ' +
  'desk:text-[17px] desk:leading-[28px]';

const kravaItalic =
  'font-sans italic font-medium text-canvas ' +
  'text-[13px] leading-[24px] ' +
  'tab:text-[14px] tab:leading-[24px] ' +
  'desk:text-[16px] desk:leading-[26px]';
