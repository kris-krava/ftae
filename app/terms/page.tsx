import { LegalShell, type LegalSection } from '@/app/_components/LegalShell';

export const metadata = {
  title: 'Terms of Service — Free Trade Art Exchange',
};

const SECTIONS: LegalSection[] = [
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
  return <LegalShell title="Terms of Service" updated="April 17, 2026" sections={SECTIONS} />;
}
