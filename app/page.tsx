import Link from 'next/link';
import Image from 'next/image';
import { Wordmark } from '@/app/_components/Wordmark';
import { LandingForm } from '@/app/_components/LandingForm';
import { StatsBand } from '@/app/_components/StatsBand';

// Inline X glyph for the "Art you made × art you love" tagline. Don't use
// the Untitled UI XClose icon here — its <path> hardcodes strokeWidth={2}
// inside the package source, so the prop we pass to the <svg> wrapper has
// no effect. We need a heavier stroke here to match Figma's wordmark X.
function HeavyX({ className, strokeWidth }: { className?: string; strokeWidth: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M18 6 6 18M6 6l12 12"
      />
    </svg>
  );
}

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

// Per-breakpoint content max-widths, matching Figma's content area at each
// frame size. Combined with a uniform px-[24px] outer wrapper, this keeps
// readable line lengths from stretching at viewports between breakpoints
// (e.g., 1100px wide screens) and on ultrawide monitors.
const HERO_MAXW = 'max-w-[342px] tab:max-w-[388px] desk:max-w-[460px]';
const CTA_MAXW = 'max-w-[342px] tab:max-w-[388px] desk:max-w-[580px]';
const PRICING_MAXW = 'max-w-[342px] tab:max-w-[388px] desk:max-w-[480px]';
const KRAVA_MAXW = 'max-w-[342px] tab:max-w-[640px] desk:max-w-[800px]';
// Stats max-w lives in StatsBand.tsx since the card is its own component.

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
      {/* Wordmark — its internal width-rules handle the visual cap */}
      <div className="w-full flex justify-center px-[24px]">
        <Wordmark variant="full" />
      </div>

      {/* Tagline bar — intentionally full-viewport-width band */}
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
        <HeavyX
          className="shrink-0 w-[16px] h-[16px] tab:w-[20px] tab:h-[20px] text-ink"
          strokeWidth={4}
        />
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

      {/* Body copy — capped by HERO_MAXW; outer pad keeps tiny viewports clear */}
      <div className="w-full px-[24px]">
        <div
          className={
            `${HERO_MAXW} mx-auto flex flex-col items-center gap-[20px] desk:gap-[24px]`
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
            You&rsquo;ve made a ton of art. Sold a lot, or a little.
            <br aria-hidden="true" />
            Still plenty more stacked in the studio.
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
            {'No buying. No selling.\nJust artists trading art with artists.'}
          </p>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section
      className={
        'w-full bg-canvas py-[48px] ' +
        'tab:py-[64px] ' +
        'desk:py-[80px]'
      }
    >
      <div className="w-full px-[24px]">
        <div
          className={
            `${CTA_MAXW} mx-auto flex flex-col items-center text-center gap-[16px]`
          }
        >
          <p
            className={
              'font-sans font-semibold text-ink ' +
              'text-[15px] leading-[24px] ' +
              'tab:text-[16px] tab:leading-[26px] ' +
              'desk:text-[17px] desk:leading-[28px] ' +
              // Constrain on desktop only — without this the line runs nearly
              // edge-to-edge of the 580px CTA cap and reads as one continuous
              // ribbon. ~388px gives a 2-line wrap closer to mobile/tablet.
              'desk:max-w-[388px]'
            }
          >
            Become a founding artist, add your art, and see what others want to trade!
          </p>
          <LandingForm />
          <p className="font-sans text-[13px] leading-[20px] text-muted tab:text-[14px] tab:leading-[22px]">
            I&rsquo;ll send you a magic link &mdash; no password needed.
          </p>
          <Link
            href="mailto:help@freetradeartexchange.com"
            className="font-sans text-accent text-[15px] leading-[26px] tab:text-[16px] tab:leading-[26px] desk:text-[17px] desk:leading-[28px]"
          >
            help@freetradeartexchange.com
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      className={
        'w-full bg-divider py-[48px] ' +
        'tab:py-[64px] ' +
        'desk:py-[80px]'
      }
    >
      <div className="w-full px-[24px]">
        <div
          className={
            `${PRICING_MAXW} mx-auto flex flex-col items-center text-center gap-[20px]`
          }
        >
          <h2
            className={
              'font-sans font-bold text-ink uppercase ' +
              'text-[17px] leading-[28px] ' +
              'tab:text-[20px] tab:leading-[30px] ' +
              'desk:text-[22px] desk:leading-[32px]'
            }
          >
            Pricing
          </h2>
          <p
            className={
              'font-sans font-bold text-ink ' +
              'text-[15px] leading-[24px] ' +
              'tab:text-[16px] tab:leading-[26px] ' +
              'desk:text-[17px] desk:leading-[28px]'
            }
          >
            I&rsquo;m honestly trying to figure out the math. As artists join, add art, and interact &mdash;
            the costs to run the platform will rise. Right now, I&rsquo;m thinking of charging a small
            fee for each successful trade or maybe a pay-what-you-can / pay-it-forward type approach.
          </p>
          <p
            className={
              'font-sans italic font-medium text-muted ' +
              'text-[13px] leading-[20px] ' +
              'tab:text-[14px] tab:leading-[22px] ' +
              'desk:text-[15px] desk:leading-[24px]'
            }
          >
            I also want to figure out a way to reward you and other founding artists. I appreciate
            your patience and participation. The design will continue to evolve as I add functionality
            to the website, leading up to the official launch.
          </p>
        </div>
      </div>
    </section>
  );
}

function KravaSection() {
  // Mobile stacks heading→image→paragraphs centered. Tablet+desktop puts a
  // fixed 233×311 image to the left of a left-aligned text column with the
  // heading inside it. Both layouts share paragraph + link markup via the
  // constants below.
  const paragraphs = (
    <>
      <p className={kravaBody}>
        I&rsquo;m an artist and designer. Been drawing and painting my whole life. And I&rsquo;ve
        been designing apps and websites for 30yrs.
      </p>
      <p className={kravaBody}>
        In March 2026, I was driving to Lake City, SC to deliver this painting for Artfields. On
        that 5hr drive from Atlanta, I had an idea.
      </p>
      <p className={kravaItalic}>How might I help artists trade art?</p>
      <p className={kravaBody}>
        I spent that entire drive dictating to my phone, asking Claude to document the concept. I
        then decided to challenge myself to ONLY use Claude Code to design and develop this
        platform, Free Trade Art Exchange.
      </p>
      <p className={kravaBody}>
        Over the past couple weeks, I&rsquo;ve been working on it. The pre-launch version is ready,
        you&rsquo;re looking at it! I hope you join, add your art, and share with friends! Let me
        know if you find any errors or have ideas on how to make FTAE better &mdash; thanks for
        being here!
      </p>
    </>
  );

  const helpLink = (
    <Link
      href="mailto:help@freetradeartexchange.com"
      className="font-sans text-canvas underline text-[15px] leading-[26px] tab:text-[16px] tab:leading-[26px] desk:text-[17px] desk:leading-[28px]"
    >
      help@freetradeartexchange.com
    </Link>
  );

  return (
    <section
      className={
        'w-full bg-accent py-[48px] ' +
        'tab:py-[64px] ' +
        'desk:py-[80px]'
      }
    >
      <div className="w-full px-[24px]">
        <div className={`${KRAVA_MAXW} mx-auto`}>
          {/* Mobile only: stacked, centered */}
          <div className="flex flex-col items-center text-center gap-[20px] tab:hidden">
            <h2 className="font-sans font-bold text-canvas uppercase text-[17px] leading-[28px]">
              Who Is Kris Krava?
            </h2>
            <Image
              src="/images/kris-krava.jpg"
              alt="Kris Krava holding a painting"
              width={1200}
              height={1601}
              sizes="100vw"
              className="w-full h-auto"
            />
            {paragraphs}
            {helpLink}
          </div>

          {/* Tablet + desktop: image left fixed 233×311, text column right, left-aligned */}
          <div className="hidden tab:flex tab:flex-row tab:items-start tab:gap-[20px] desk:gap-[22px]">
            <Image
              src="/images/kris-krava.jpg"
              alt="Kris Krava holding a painting"
              width={1200}
              height={1601}
              sizes="233px"
              className="shrink-0 w-[233px] h-[311px] object-cover"
            />
            <div className="flex flex-col items-start text-left gap-[20px] desk:gap-[22px] flex-1">
              <h2
                className={
                  'font-sans font-bold text-canvas ' +
                  'text-[20px] leading-[30px] ' +
                  'desk:text-[22px] desk:leading-[32px]'
                }
              >
                Who Is Kris Krava?
              </h2>
              {paragraphs}
              {helpLink}
            </div>
          </div>
        </div>
      </div>
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
  'tab:text-[15px] tab:leading-[24px] ' +
  'desk:text-[16px] desk:leading-[26px]';
