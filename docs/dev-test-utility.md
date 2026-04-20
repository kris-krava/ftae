# Dev test utility — `/dev/test-login`

Local-only scenario runner for iterating on onboarding + authenticated UX without going through the magic-link email flow.

## Enabling

The route is behind multiple gates. All four must pass for it to load:

1. `NODE_ENV !== 'production'` (Next.js sets this automatically on Vercel prod builds; always production there).
2. `FTAE_ENABLE_DEV_TOOLS=1` in your environment.
3. Host header must not match `freetradeartexchange.com` or `*.vercel.app`.
4. Module-load safety net refuses to initialize if (1) and (2) are ever simultaneously true in production (double-check).

To turn it on locally:

```bash
# in .env.local (or export before running)
FTAE_ENABLE_DEV_TOOLS=1
```

Then:

```bash
npm run dev
open http://localhost:3000/dev/test-login
```

Without the flag set, the route returns 404.

## Running a scenario

Open `/dev/test-login`, click a scenario tile. The server seeds the test user's state idempotently, generates a Supabase magic-link action URL, and the browser jumps to it. Supabase verifies, the session cookie is set, and you land on the scenario's target page (e.g. `/onboarding/step-3`, `/app/following`).

Re-clicking the same scenario resets the test user to the scenario's canonical state — safe to run repeatedly.

## Test user identification

Every test user (primary and any auxiliary) has an email in the `@test.ftae.local` domain. Examples:

- `scenario-founding-member@test.ftae.local`
- `aux-referred-with-referral@test.ftae.local`
- `aux-follower-returning-user-0@test.ftae.local`

This domain is grep-able in SQL and safe — it can't collide with a real user.

## Cleanup

Two paths, same logic:

1. **In the route**: click _Delete all test users_ on `/dev/test-login`.
2. **CLI**: `node scripts/cleanup-test-users.mjs`

Both delete every `auth.users` + `public.users` row with email ending `@test.ftae.local`, plus cascade to related rows and storage prefixes (`avatars/<id>/*`, `artwork-photos/<id>/*`).

The CLI refuses to run against a Supabase URL containing `freetradeartexchange` unless `--force` is passed — a safety net in case dev + prod share one project.

## Caveats on stats pollution

Because dev + prod share the same Supabase project:

- Test artworks are inserted with `is_trade_available = false`, so they **do not** inflate the landing "Pieces Ready to Trade" counter.
- Test users that set `is_founding_member = true` (the `founding-member`, `with-referral`, and `returning-user` scenarios) **do** inflate the Founding Artists count in `/api/stats` while they exist. The landing page no longer displays this counter, but the API still returns it. Clean up after each session.

Robust fixes would require either:
- A separate Supabase project for dev (best),
- Modifying `app/_lib/landing-stats.ts` to exclude `@test.ftae.local` (disallowed by the original task spec — no app-code modification),
- Adding an `is_test_user` column + filter (schema change, also disallowed).

## Adding a new scenario

Append an object to `app/dev/test-login/scenarios.ts`:

```ts
{
  id: 'new-scenario-id',                // kebab-case; used in email address
  name: 'Human-readable tile title',
  description: 'One-line description shown under the title.',
  redirect: '/app/following',           // where the browser lands after login
  asFirstTimeLogin: false,              // true = no pre-seed, routes through /auth/callback
  profile: {
    name: 'Test Whoever',
    location_city: 'Atlanta, GA',
    bio: '...',
    website_url: 'https://example.com',
    social_platform: 'instagram',
    social_handle: 'test',
    avatar_url: 'https://...',
    is_founding_member: false,
    profile_completion_pct: 80,
  },
  mediums: ['Oil', 'Watercolor'],       // names resolved against the mediums table
  artworks: [
    { title: '...', year: 2024, medium: '...', dimensions: '...', photos: [{ url: '...', photo_type: 'front' }] },
  ],
  credits: [{ credit_type: 'founding_member', months_credited: 3 }],
  notifications: [{ type: 'profile_nudge', message: '...' }],
  referral: { asReferrer: true, completed: true },  // optional
  followersCount: 2,                                // optional — creates N aux users who follow
}
```

The seeder in `app/dev/test-login/actions.ts` interprets every field. No new scenario-specific code is required for standard cases; add a dedicated hook only if you need behavior the schema above doesn't cover.

## Verifying prod is unaffected

After deploying any change to these files, always confirm production returns 404:

```bash
curl -I https://www.freetradeartexchange.com/dev/test-login
# HTTP/2 404
```

And the finish route:

```bash
curl -I "https://www.freetradeartexchange.com/dev/test-login/finish?code=x"
# HTTP/2 404
```

## File map

- `app/dev/test-login/_guard.ts` — env + host guards, test domain constants
- `app/dev/test-login/scenarios.ts` — declarative scenario definitions
- `app/dev/test-login/actions.ts` — server actions: `runScenarioAction`, `cleanupTestUsersAction`
- `app/dev/test-login/_cleanup.ts` — shared cleanup implementation
- `app/dev/test-login/page.tsx` — server entry (404s unless enabled)
- `app/dev/test-login/TestLoginClient.tsx` — menu UI
- `app/dev/test-login/finish/route.ts` — code-exchange redirect target
- `scripts/cleanup-test-users.mjs` — standalone cleanup CLI
