import Link from 'next/link';
import { SignOutButton } from '@/components/profile/SignOutButton';

interface AccountSectionProps {
  email: string;
  /** Count of referral_bonus credits the user has earned (0–3). Always
   * rendered, even when 0. */
  creditsEarned: number;
}

export function AccountSection({ email, creditsEarned }: AccountSectionProps) {
  return (
    <section className="w-full mt-[16px] flex flex-col items-center gap-[12px]">
      <span aria-hidden className="block w-full h-px bg-muted/20" />
      <h2 className="font-sans font-medium text-[11px] tracking-[1px] text-muted">ACCOUNT</h2>
      <p className="font-sans text-[13px] text-ink text-center">Credits: {creditsEarned}</p>
      <div className="w-full flex items-center justify-center gap-[5px] font-sans text-[13px]">
        <span className="min-w-0 text-ink truncate">{email}</span>
        <Link href="/app/profile/edit-email" className="text-accent shrink-0">
          Edit
        </Link>
      </div>
      <div className="flex items-center justify-center gap-[10px] font-sans text-[13px]">
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent">
          Terms of Service
        </Link>
        <span aria-hidden className="text-divider">|</span>
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent">
          Privacy Policy
        </Link>
        <span aria-hidden className="text-divider">|</span>
        <SignOutButton />
      </div>
    </section>
  );
}
