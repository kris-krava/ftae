import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { DEV_TOOLS_ENABLED, assertDev, assertNotProdHost } from './_guard';
import { SCENARIOS } from './scenarios';
import { TestLoginClient } from './TestLoginClient';

export default async function TestLoginPage() {
  if (!DEV_TOOLS_ENABLED) notFound();
  assertDev();
  assertNotProdHost((await headers()).get('host'));

  const scenarios = SCENARIOS.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    redirect: s.redirect,
  }));

  return <TestLoginClient scenarios={scenarios} />;
}
