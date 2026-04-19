import Link from 'next/link';
import { Wordmark } from '@/app/_components/Wordmark';

export const metadata = {
  title: 'Terms of Service — Free Trade Art Exchange',
};

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. ACCEPTANCE OF TERMS',
    body:
      'By creating an account on Free Trade Art Exchange ("FTAE," "we," "us"), you agree to these Terms of Service and our Privacy Policy.',
  },
  {
    heading: '2. DESCRIPTION OF SERVICE',
    body:
      'FTAE is a community platform where visual artists can connect, share their work, and arrange to trade original artwork with one another. We do not facilitate monetary transactions or serve as intermediaries in trades.',
  },
  {
    heading: '3. ELIGIBILITY AND ACCOUNT REQUIREMENTS',
    body:
      '- You must be at least 18 years old to use FTAE\n- You must provide accurate information during registration\n- You are responsible for maintaining the security of your account\n- One account per person',
  },
  {
    heading: '4. USER CONTENT AND ARTWORK',
    body:
      '- You may only upload original artwork that you created\n- You retain ownership of your content and artwork\n- You grant FTAE a license to display your content on the platform\n- You represent that uploaded artwork is original, handmade, and not AI-generated\n- You may not upload content that violates intellectual property rights',
  },
  {
    heading: '5. PROHIBITED CONDUCT',
    body:
      'You may not:\n- Upload AI-generated or digitally created artwork\n- Misrepresent the authorship, medium, or condition of artwork\n- Use the platform for commercial sales or monetary transactions\n- Harass, abuse, or harm other users\n- Violate any applicable laws or regulations',
  },
  {
    heading: '6. TRADES AND TRANSACTIONS',
    body:
      '- FTAE does not facilitate, guarantee, or insure artwork trades\n- All trades are conducted directly between users at their own risk\n- We are not responsible for the condition, authenticity, or delivery of traded artwork\n- Users are solely responsible for shipping, insurance, and customs',
  },
  {
    heading: '7. ACCOUNT TERMINATION',
    body:
      'We reserve the right to suspend or terminate accounts that violate these terms or engage in prohibited conduct.',
  },
  {
    heading: '8. DISCLAIMERS',
    body:
      'FTAE is provided "as is" without warranties of any kind. We do not guarantee the accuracy of user-provided information about artwork or artists.',
  },
  {
    heading: '9. LIMITATION OF LIABILITY',
    body:
      'FTAE shall not be liable for any damages arising from your use of the platform or participation in trades.',
  },
  {
    heading: '10. GOVERNING LAW',
    body: 'These terms are governed by the laws of Georgia, United States.',
  },
];

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="April 17, 2026" sections={SECTIONS} />
  );
}

interface LegalShellProps {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
}

export function LegalShell({ title, updated, sections }: LegalShellProps) {
  return (
    <main
      className={
        'flex flex-col items-center w-full min-h-full bg-canvas ' +
        'px-[32px] pt-[88px] pb-[64px] ' +
        'tab:px-[124px] tab:pt-[100px] tab:pb-[80px] ' +
        'desk:px-[350px] desk:pt-[120px] desk:pb-[96px]'
      }
    >
      <Wordmark variant="short" size="compact" />
      <h1
        className={
          'font-serif font-bold text-ink text-center ' +
          'mt-[24px] text-[28px] leading-[36px] ' +
          'tab:mt-[28px] tab:text-[34px] tab:leading-[44px] ' +
          'desk:mt-[32px] desk:text-[38px] desk:leading-[50px]'
        }
      >
        {title}
      </h1>
      <p
        className={
          'font-sans text-muted text-center ' +
          'mt-[8px] text-[13px] leading-[20px] ' +
          'tab:mt-[10px] tab:text-[14px] tab:leading-[22px] ' +
          'desk:mt-[12px] desk:text-[15px] desk:leading-[24px]'
        }
      >
        Last updated: {updated}
      </p>

      <div
        className={
          'mt-[40px] flex flex-col w-full ' +
          'gap-[28px] ' +
          'tab:mt-[48px] tab:gap-[32px] ' +
          'desk:mt-[56px] desk:gap-[36px]'
        }
      >
        {sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-[8px] tab:gap-[10px] desk:gap-[12px]">
            <h2
              className={
                'font-sans font-semibold text-ink tracking-[1.5px] ' +
                'text-[13px] leading-[18px] ' +
                'tab:text-[14px] tab:leading-[20px] ' +
                'desk:text-[15px] desk:leading-[22px]'
              }
            >
              {s.heading}
            </h2>
            <p
              className={
                'font-sans text-ink whitespace-pre-line ' +
                'text-[15px] leading-[24px] ' +
                'tab:text-[16px] tab:leading-[26px] ' +
                'desk:text-[17px] desk:leading-[28px]'
              }
            >
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <LegalFooter />
    </main>
  );
}

function LegalFooter() {
  return (
    <footer className="flex flex-col items-center w-full mt-[40px] tab:mt-[48px] desk:mt-[56px] gap-[10px]">
      <span aria-hidden className="block w-[80px] h-px bg-divider" />
      <p className="font-sans font-medium text-muted text-center text-[13px] leading-[20px] tab:text-[14px] tab:leading-[22px]">
        Questions? Email us at
      </p>
      <Link
        href="mailto:help@freetradeartexchange.com"
        className="font-sans text-accent text-center text-[13px] leading-[20px] tab:text-[14px] tab:leading-[22px]"
      >
        help@freetradeartexchange.com
      </Link>
    </footer>
  );
}
