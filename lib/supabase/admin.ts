import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Only use in server-side code.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.

// Belt-and-suspenders against the dev/prod mixup that wiped real data
// in April 2026. If .env.local ever points at the prod project from a
// non-prod runtime again, refuse to boot rather than silently issue
// admin writes against production.
const PROD_PROJECT_REF = 'agwulzsczrrjyhyjhwgw';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    'lib/supabase/admin.ts: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
  );
}

if (url.includes(`${PROD_PROJECT_REF}.supabase.co`) && process.env.NODE_ENV !== 'production') {
  throw new Error(
    `lib/supabase/admin.ts refusing to initialize: NEXT_PUBLIC_SUPABASE_URL points at the production Supabase project (${PROD_PROJECT_REF}) but NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}. Update .env.local to point at the dev project before running locally.`,
  );
}

export const supabaseAdmin = createClient(url, serviceKey);
