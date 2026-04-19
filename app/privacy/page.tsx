import { LegalShell } from '@/app/terms/page';

export const metadata = {
  title: 'Privacy Policy — Free Trade Art Exchange',
};

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. INFORMATION WE COLLECT',
    body:
      'We collect information you provide directly to us:\n- Email address (for account creation and communication)\n- Profile information (name, location, bio, website, social media handles)\n- Artwork information (photos, titles, medium, dimensions, statements)\n- Communication data (messages, support requests)',
  },
  {
    heading: '2. HOW WE USE YOUR INFORMATION',
    body:
      '- To provide and maintain the FTAE platform\n- To communicate with you about your account and platform updates\n- To display your profile and artwork to other users\n- To prevent fraud and ensure platform security\n- To improve our services',
  },
  {
    heading: '3. HOW WE SHARE YOUR INFORMATION',
    body:
      'We do not sell your personal information. We may share information:\n- Publicly as part of your artist profile (name, location, bio, artwork)\n- With service providers who help us operate the platform\n- When required by law or to protect our rights',
  },
  {
    heading: '4. DATA STORAGE AND SECURITY',
    body:
      '- Your data is stored securely using industry-standard practices\n- We use Supabase for data storage and Resend for email communications\n- We retain your data while your account is active and for a reasonable period after closure',
  },
  {
    heading: '5. YOUR CHOICES',
    body:
      '- You can update your profile information at any time\n- You can delete your account by contacting help@freetradeartexchange.com\n- You can opt out of non-essential communications',
  },
  {
    heading: '6. COOKIES AND TRACKING',
    body:
      'We use essential cookies for authentication and platform functionality. We do not use tracking cookies or third-party analytics.',
  },
  {
    heading: '7. CHANGES TO THIS POLICY',
    body: 'We may update this Privacy Policy and will notify users of significant changes.',
  },
];

export default function PrivacyPage() {
  return <LegalShell title="Privacy Policy" updated="April 17, 2026" sections={SECTIONS} />;
}
