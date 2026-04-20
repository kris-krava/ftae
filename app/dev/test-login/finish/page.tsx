import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { DEV_TOOLS_ENABLED, assertDev, assertNotProdHost } from '../_guard';
import { FinishClient } from './FinishClient';

export const dynamic = 'force-dynamic';

export default function FinishPage() {
  if (!DEV_TOOLS_ENABLED) notFound();
  assertDev();
  assertNotProdHost(headers().get('host'));
  return <FinishClient />;
}
