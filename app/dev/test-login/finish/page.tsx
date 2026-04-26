import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { DEV_TOOLS_ENABLED, assertDev, assertNotProdHost } from '../_guard';
import { FinishClient } from './FinishClient';

export default async function FinishPage() {
  if (!DEV_TOOLS_ENABLED) notFound();
  assertDev();
  assertNotProdHost((await headers()).get('host'));
  return <FinishClient />;
}
