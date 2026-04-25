import type { NextRequest } from 'next/server';
import { handleEmailChangeConfirm } from '@/lib/email-change';

// Click target for the confirmation link sent to the user's PROSPECTIVE new
// email. Marks the new-side confirmation; if the old-side is already
// confirmed, applies the email change.
export function GET(request: NextRequest) {
  return handleEmailChangeConfirm(request, 'new');
}
