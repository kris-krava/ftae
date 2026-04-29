import { redirect } from 'next/navigation';
import { ConfirmClient } from './ConfirmClient';

interface ConfirmPageProps {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}

export default async function ConfirmPage(props: ConfirmPageProps) {
  const { token_hash: tokenHash, type } = await props.searchParams;

  // Missing or invalid params — bounce to landing rather than rendering a
  // dead button. Most likely a stale link or someone hitting the URL directly.
  if (!tokenHash || !type) {
    redirect('/?error=invalid_link');
  }

  return <ConfirmClient tokenHash={tokenHash} type={type} />;
}
