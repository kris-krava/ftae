import type { NextRequest } from 'next/server';
import { handleEmailChangeConfirm } from '@/lib/email-change';

// Click target for the confirmation link sent to the user's CURRENT email.
// Marks the old-side confirmation; if the new-side is already confirmed,
// applies the email change.
export function GET(request: NextRequest) {
  return handleEmailChangeConfirm(request, 'old');
}
