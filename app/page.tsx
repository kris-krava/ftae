import Link from 'next/link';
import Image from 'next/image';
import { Wordmark } from '@/app/_components/Wordmark';
import { LandingForm } from '@/app/_components/LandingForm';
import { StatsBand } from '@/app/_components/StatsBand';

// Per-breakpoint content cap — matches the Figma frame columns (326/520/580).
// The 326 mobile cap mirrors Figma's wrapping on any phone ≥ 390px wide.
const COL_MAXW = 'max-w-[360px] tab:max-w-[520px] desk:max-w-[580px]';
// Narrow cap for editorial-feel sections (HIW, You're early, About money) —
// they read as a calmer middle band on desktop, holding the tablet 520 width.
const COL_MAXW_NARROW = 'max-w-[360px] tab:max-w-[520px] desk:max-w-[520px]';
const SECTION_PAD = 'px-[15px] tab:px-[124px] desk:px-[350px]';

// Inline X glyph for the "Art you made × art you love" tagline. Untitled UI's
// XClose hardcodes strokeWidth=2 inside the package; the prop on the wrapper
// has no effect. Inline gives us full control over weight.
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

// Filled 5-pointed star — bullet-2 mid-line accent in the Founding section.
function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2.5l2.939 5.955 6.572.955-4.756 4.636 1.123 6.546L12 17.5l-5.878 3.092 1.123-6.546L2.49 9.41l6.572-.955L12 2.5z"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center w-full min-h-full bg-canvas">
      <HeroSection />
      <StatsBand />
      <AreYouLikeMeSection />
      <FoundingArtistsSection />
      <HowItWorksSection />
      <YoureEarlySection />
      <AboutMoneySection />
      <KrisKravaSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="w-full bg-canvas">
      {/* Wordmark — vertical rhythm matches Figma: 64/80/96 above, 56/64/80 below. */}
      <div className="w-full flex justify-center pt-[64px] pb-[56px] tab:pt-[80px] tab:pb-[64px] desk:pt-[96px] desk:pb-[80px]">
        <Wordmark variant="full" />
      </div>
      {/* Tagline band — full-bleed terracotta strip. */}
      <div className="w-full bg-accent flex items-center justify-center gap-[4px] py-[12px] tab:py-[12px] desk:py-[16px] h-[56px] tab:h-[64px] desk:h-[72px]">
        <span
          className={
            'flex-1 text-right uppercase font-sans font-bold text-canvas ' +
            'text-[17px] leading-[28px] ' +
            'tab:text-[22px] tab:leading-[32px] ' +
            'desk:text-[26px] desk:leading-[36px]'
          }
        >
          Art you made
        </span>
        <HeavyX
          className={
            'shrink-0 text-ink ' +
            'w-[16px] h-[16px] ' +
            'tab:w-[22px] tab:h-[22px] ' +
            'desk:w-[26px] desk:h-[26px]'
          }
          strokeWidth={3}
        />
        <span
          className={
            'flex-1 text-left uppercase font-sans font-bold text-canvas ' +
            'text-[17px] leading-[28px] ' +
            'tab:text-[22px] tab:leading-[32px] ' +
            'desk:text-[26px] desk:leading-[36px]'
          }
        >
          art you love
        </span>
      </div>
      {/* Blush breathing room below the tagline band before the stats panel. */}
      <div aria-hidden className="w-full h-[64px] tab:h-[80px] desk:h-[96px]" />
    </section>
  );
}

function AreYouLikeMeSection() {
  return (
    <section
      className={
        'w-full bg-canvas text-ink text-center ' +
        'py-[80px] tab:py-[96px] desk:py-[64px] ' +
        SECTION_PAD
      }
    >
      <div className={`${COL_MAXW} mx-auto flex flex-col items-center`}>
        <h2
          className={
            'font-serif font-bold ' +
            'text-[24px] leading-[32px] ' +
            'tab:text-[28px] tab:leading-[36px] ' +
            'desk:text-[32px] desk:leading-[40px]'
          }
        >
          Are you like me?
        </h2>
        <p
          className={
            'font-sans ' +
            'mt-[20px] text-[15px] leading-[24px] ' +
            'tab:mt-[28px] tab:text-[16px] tab:leading-[26px] ' +
            'desk:mt-[36px] desk:text-[17px] desk:leading-[28px]'
          }
        >
          You love the work other artists are making. You&rsquo;d collect it all if only the dollars
          made sense! There are artists out there that would love to have your work in their home,
          too.
        </p>
        <p
          className={
            'font-sans ' +
            'mt-[16px] text-[15px] leading-[24px] ' +
            'tab:mt-[20px] tab:text-[16px] tab:leading-[26px] ' +
            'desk:mt-[24px] desk:text-[17px] desk:leading-[28px]'
          }
        >
          Trade art you&rsquo;ve made for the art you love.
          <br aria-hidden="true" />
          No buying. No selling.
        </p>
        {/* Symmetric breath: same gap above this kicker as the gap from
            the heading down to para1 (20 / 28 / 36). */}
        <p
          className={
            'font-serif italic font-bold text-ink ' +
            'mt-[20px] text-[24px] leading-[26px] ' +
            'tab:mt-[28px] tab:text-[28px] tab:leading-[32px] ' +
            'desk:mt-[36px] desk:text-[32px] desk:leading-[36px]'
          }
        >
          Just artists trading art!
        </p>
      </div>
    </section>
  );
}

function FoundingArtistsSection() {
  return (
    <section
      className={
        'w-full bg-ink text-white text-center ' +
        'py-[80px] tab:py-[96px] desk:py-[64px] ' +
        SECTION_PAD
      }
    >
      <div className={`${COL_MAXW} mx-auto flex flex-col items-center`}>
        <h2
          className={
            'font-serif font-bold ' +
            'text-[24px] leading-[34px] ' +
            'tab:text-[32px] tab:leading-[40px] ' +
            'desk:text-[38px] desk:leading-[46px]'
          }
        >
          Founding Artists trade free. Forever.
        </h2>
        <p
          className={
            'font-sans ' +
            'mt-[24px] text-[14px] leading-[22px] ' +
            'tab:mt-[34px] tab:text-[15px] tab:leading-[24px] ' +
            'desk:mt-[44px] desk:text-[16px] desk:leading-[26px]'
          }
        >
          I&rsquo;m building this in the open, and I&rsquo;m looking for founding artists to help me
          shape it. Join before we launch on July 1, 2026 and you get:
        </p>

        {/* Bullets — left-aligned within the centered column. Dots are accent
            (not white) and sit close to copy per Figma. */}
        <ul
          className={
            'w-full text-left ' +
            'mt-[34px] flex flex-col gap-[16px] text-[14px] leading-[22px] ' +
            'tab:mt-[44px] tab:gap-[16px] tab:text-[15px] tab:leading-[24px] ' +
            'desk:mt-[52px] desk:gap-[18px] desk:text-[16px] desk:leading-[26px]'
          }
        >
          <li className="flex gap-[10px] tab:gap-[12px] desk:gap-[14px]">
            <span
              className={
                'shrink-0 mt-[8px] tab:mt-[9px] desk:mt-[10px] rounded-full bg-accent ' +
                'w-[5px] h-[5px] tab:w-[6px] tab:h-[6px] desk:w-[7px] desk:h-[7px]'
              }
            />
            <p>
              <span className="font-semibold">No per-trade fees. Ever.</span>{' '}
              Every artist who joins after launch pays a small fee on each trade. Founding Artists
              never do.
            </p>
          </li>
          <li className="flex gap-[10px] tab:gap-[12px] desk:gap-[14px]">
            <span
              className={
                'shrink-0 mt-[8px] tab:mt-[9px] desk:mt-[10px] rounded-full bg-accent ' +
                'w-[5px] h-[5px] tab:w-[6px] tab:h-[6px] desk:w-[7px] desk:h-[7px]'
              }
            />
            <p className="flex flex-wrap items-center gap-x-[6px]">
              <span className="font-semibold">A permanent Founding Artist</span>
              <StarIcon className="inline-block shrink-0 text-accent w-[14px] h-[14px] tab:w-[16px] tab:h-[16px] desk:w-[18px] desk:h-[18px]" />
              <span className="font-semibold">profile badge.</span>
            </p>
          </li>
          <li className="flex gap-[10px] tab:gap-[12px] desk:gap-[14px]">
            <span
              className={
                'shrink-0 mt-[8px] tab:mt-[9px] desk:mt-[10px] rounded-full bg-accent ' +
                'w-[5px] h-[5px] tab:w-[6px] tab:h-[6px] desk:w-[7px] desk:h-[7px]'
              }
            />
            <p>
              <span className="font-semibold">A real say in how this gets built.</span>{' '}
              Your feedback comes straight to me.
            </p>
          </li>
        </ul>

        <div className="mt-[32px] tab:mt-[40px] desk:mt-[48px] flex flex-col items-center w-full">
          <LandingForm submitLabel="Create Profile or Sign In" variant="dark" />
        </div>

        <p
          className={
            'font-sans text-white/70 ' +
            'mt-[16px] text-[13px] leading-[20px] ' +
            'tab:text-[14px] tab:leading-[22px]'
          }
        >
          I&rsquo;ll send you a magic link. No password needed.
        </p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps: Array<{ title: string; body: React.ReactNode }> = [
    {
      title: 'Find art you love.',
      body: 'Browse other artists. Follow the ones whose work moves you. Bookmark the artwork you want.',
    },
    {
      title: "Add art you've made.",
      body: (
        <>
          Upload pieces from your catalog that you&rsquo;d be happy to trade for art you love.
        </>
      ),
    },
    {
      title: 'Propose a trade.',
      body: 'When trading opens July 1, offer yours for theirs. They accept, decline, or counter.',
    },
    {
      title: 'Bring it home.',
      body: 'Live your life with art you love.',
    },
  ];

  return (
    <section
      className={
        'w-full bg-canvas text-ink ' +
        'py-[80px] tab:py-[96px] desk:py-[64px] ' +
        SECTION_PAD
      }
    >
      <div className={`${COL_MAXW_NARROW} mx-auto flex flex-col items-stretch`}>
        <p
          className={
            'font-sans font-medium uppercase text-accent text-center ' +
            'text-[12px] leading-[16px] tracking-[1.92px] ' +
            'tab:text-[13px] tab:leading-[18px] tab:tracking-[2.08px] ' +
            'desk:text-[14px] desk:leading-[20px] desk:tracking-[2.24px]'
          }
        >
          How it works
        </p>

        {/* Grid keeps numerals in a column, narrow enough that 2/3/4 fit but
            with no perceived empty buffer between numeral and text. Tight
            gap matches the Figma feel; numeral leading equals title leading
            so its cap-top sits visibly above the title's. */}
        <ol
          className={
            'mt-[32px] flex flex-col gap-[28px] ' +
            'tab:mt-[36px] tab:gap-[28px] ' +
            'desk:mt-[40px] desk:gap-[36px]'
          }
        >
          {steps.map((step, i) => (
            <li
              key={i}
              className={
                'grid grid-cols-[auto_1fr] items-start ' +
                'gap-x-[12px] tab:gap-x-[16px] desk:gap-x-[20px]'
              }
            >
              {/* Numeral line-height matches the title's, so the giant glyph
                  bleeds above the line-box and its cap-top sits visibly
                  above the title's cap-top — matches Figma's intentional
                  raise of the numeral relative to the title. */}
              <span
                className={
                  'shrink-0 font-serif italic text-accent ' +
                  'text-[36px] leading-[22px] ' +
                  'tab:text-[44px] tab:leading-[24px] ' +
                  'desk:text-[56px] desk:leading-[26px]'
                }
              >
                {i + 1}
              </span>
              <div>
                <p
                  className={
                    'font-serif font-bold ' +
                    'text-[16px] leading-[22px] ' +
                    'tab:text-[18px] tab:leading-[24px] ' +
                    'desk:text-[20px] desk:leading-[26px]'
                  }
                >
                  {step.title}
                </p>
                <p
                  className={
                    'font-sans ' +
                    'text-[14px] leading-[22px] ' +
                    'tab:text-[15px] tab:leading-[24px] ' +
                    'desk:text-[16px] desk:leading-[26px]'
                  }
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function YoureEarlySection() {
  return (
    <section
      className={
        'w-full bg-peach text-ink text-center ' +
        'pt-[24px] pb-[34px] tab:py-[42px] desk:py-[61px] ' +
        SECTION_PAD
      }
    >
      <div className={`${COL_MAXW_NARROW} mx-auto flex flex-col items-center`}>
        <h2
          className={
            'font-serif font-bold italic ' +
            'text-[22px] leading-[30px] ' +
            'tab:text-[26px] tab:leading-[34px] ' +
            'desk:text-[30px] desk:leading-[38px]'
          }
        >
          You&rsquo;re early.
        </h2>
        <p
          className={
            'font-sans ' +
            'mt-[22px] text-[15px] leading-[24px] ' +
            'tab:mt-[28px] tab:text-[16px] tab:leading-[26px] ' +
            'desk:mt-[36px] desk:text-[17px] desk:leading-[28px]'
          }
        >
          Right now it&rsquo;s me, a few artist friends, and a growing stack of art ready for
          trading to begin.
        </p>
        {/* Symmetric breath: gap above this accent matches gap above body
            paragraph (22 / 28 / 36). */}
        <div
          className={
            'font-serif italic text-accent ' +
            'mt-[22px] text-[17px] leading-[26px] ' +
            'tab:mt-[28px] tab:text-[18px] tab:leading-[28px] ' +
            'desk:mt-[36px] desk:text-[20px] desk:leading-[30px]'
          }
        >
          <p>I&rsquo;d love for you to join me.</p>
          <p>Let&rsquo;s build this space together.</p>
        </div>
      </div>
    </section>
  );
}

function AboutMoneySection() {
  return (
    <section
      className={
        'w-full bg-canvas text-muted text-center ' +
        'py-[48px] tab:py-[56px] desk:py-[80px] ' +
        SECTION_PAD
      }
    >
      <div className={`${COL_MAXW_NARROW} mx-auto flex flex-col items-center`}>
        <h2
          className={
            'font-sans font-medium ' +
            'text-[13px] leading-[18px] tracking-[0.4px] ' +
            'tab:text-[13px] tab:leading-[18px] ' +
            'desk:text-[14px] desk:leading-[20px]'
          }
        >
          About money.
        </h2>
        <p
          className={
            'font-sans ' +
            'mt-[12px] text-[12px] leading-[19px] ' +
            'tab:text-[13px] tab:leading-[20px] ' +
            'desk:text-[13px] desk:leading-[21px]'
          }
        >
          There&rsquo;s no subscription. No monthly fees. No commissions on your trades. No ads.
          Just a small per-trade fee after launch.
        </p>
        <p
          className={
            'font-sans italic text-ink ' +
            'mt-[20px] text-[12px] leading-[19px] ' +
            'tab:text-[13px] tab:leading-[20px] ' +
            'desk:text-[13px] desk:leading-[21px]'
          }
        >
          Founding Artists never pay the per-trade fee.
        </p>
      </div>
    </section>
  );
}

function KrisKravaSection() {
  return (
    <section
      className={
        'w-full bg-peach text-ink ' +
        'py-[72px] tab:py-[96px] desk:py-[64px] ' +
        SECTION_PAD
      }
    >
      <div className={`${COL_MAXW} mx-auto flex flex-col items-stretch`}>
        <h2
          className={
            'font-serif font-bold text-center ' +
            'text-[24px] leading-[32px] ' +
            'tab:text-[28px] tab:leading-[36px] ' +
            'desk:text-[32px] desk:leading-[40px]'
          }
        >
          I&rsquo;m Kris Krava.
        </h2>
        <Image
          src="/images/kris-krava.jpg"
          alt="Kris Krava holding a painting"
          width={1200}
          height={1601}
          sizes="(max-width: 767px) 326px, (max-width: 1279px) 520px, 580px"
          className={
            'mt-[24px] tab:mt-[36px] desk:mt-[48px] ' +
            'w-full h-auto rounded-[12px] tab:rounded-[14px] desk:rounded-[16px] ' +
            'aspect-[326/228] tab:aspect-[520/364] desk:aspect-[580/406] object-cover'
          }
        />
        <p
          className={
            'font-sans ' +
            'mt-[24px] text-[14px] leading-[22px] ' +
            'tab:mt-[32px] tab:text-[15px] tab:leading-[24px] ' +
            'desk:mt-[36px] desk:text-[16px] desk:leading-[26px]'
          }
        >
          An artist, designer, and art collector. I&rsquo;ve been drawing and painting my entire
          life. Building software for 30 years. I&rsquo;ve sold plenty of my work, but have even
          more stacked in the studio. I love trading with other artists. But asking can be an
          awkward conversation.
        </p>
        <p
          className={
            'font-sans ' +
            'mt-[24px] text-[14px] leading-[22px] ' +
            'tab:text-[15px] tab:leading-[24px] ' +
            'desk:text-[16px] desk:leading-[26px]'
          }
        >
          A few weeks ago, while delivering my painting to Artfields, I had an idea.
        </p>
        <p
          className={
            'font-serif italic text-accent ' +
            'mt-[10px] text-[17px] leading-[26px] ' +
            'tab:text-[18px] tab:leading-[28px] ' +
            'desk:text-[20px] desk:leading-[30px]'
          }
        >
          How might I help artists trade their own artwork with each other?
        </p>
        <p
          className={
            'font-sans ' +
            'mt-[14px] text-[14px] leading-[22px] ' +
            'tab:text-[15px] tab:leading-[24px] ' +
            'desk:text-[16px] desk:leading-[26px]'
          }
        >
          Three weeks later, here you are.
        </p>
        <p
          className={
            'font-sans text-muted text-center ' +
            'mt-[28px] text-[13px] leading-[20px] ' +
            'tab:mt-[32px] tab:text-[14px] tab:leading-[22px]'
          }
        >
          If you find bugs, have ideas, or just want to talk shop:
        </p>
        <Link
          href="mailto:help@freetradeartexchange.com"
          className={
            'font-sans font-medium text-accent text-center ' +
            'mt-[6px] text-[13px] leading-[20px] ' +
            'tab:text-[14px] tab:leading-[22px]'
          }
        >
          help@freetradeartexchange.com
        </Link>
      </div>
    </section>
  );
}
