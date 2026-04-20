# Dev test utility — `/dev/test-login`

Local-only scenario runner for iterating on the FTAE onboarding flow and the authenticated app experience without round-tripping through the magic-link email.

## Contents

- [Enabling the route](#enabling-the-route)
- [Scenario catalog](#scenario-catalog)
- [Running a scenario](#running-a-scenario)
- [Test-user identification](#test-user-identification)
- [Cleanup](#cleanup)
- [Adding a new scenario](#adding-a-new-scenario)
- [Protection layers](#protection-layers)
- [File map](#file-map)

---

## Enabling the route

The route is gated behind multiple layers. Every layer must pass for the route to load:

```bash
# in .env.local (or exported before `npm run dev`)
FTAE_ENABLE_DEV_TOOLS=1
```

Then:

```bash
npm run dev
open http://localhost:3000/dev/test-login
```

Without the flag set — or on any host that looks like production — the route returns 404.

---

## Scenario catalog

Every scenario's primary user is created with `is_test_user = true` and an email of the form `scenario-<id>@test.ftae.local`.

| Scenario | Redirects to | State created |
|---|---|---|
| **New user** | `/onboarding/step-1` | Empty profile: username + referral_code set, all profile fields null, `profile_completion_pct = 0`. |
| **Partial profile** | `/onboarding/step-3` | Steps 1 + 2 complete: name, location, bio, avatar, 2 selected mediums, `profile_completion_pct = 50`. |
| **Complete profile — no artwork** | `/onboarding/step-4` | All profile fields (name, location, bio, website, social, avatar) + 2 mediums; no artworks; `profile_completion_pct = 85`. |
| **Complete profile — founding member** | `/app/following` | Full profile + 2 artworks + `is_founding_member = true` + 3 months `founding_member` credit; `profile_completion_pct = 100`. |
| **Complete profile — with referral** | `/app/following` | Founding-member state plus an auxiliary test user (`aux-referred-…`) with a completed referral record and `referral_bonus` credit linked to that referral. |
| **Returning user** | `/app/following` | Founding member with 2 artworks + 2 auxiliary followers (`aux-follower-…`) + 2 notifications (one unread referral_joined, one read profile_nudge). |

Test artworks are always inserted with `is_trade_available = false` so they cannot leak into the landing "Pieces Ready to Trade" counter.

---

## Running a scenario

Click any tile. The server:

1. **Auto-cleans the prior run.** Deletes the scenario's primary user + all aux users (auth row + public row + storage objects) so the DB never accumulates stale test data.
2. **Creates a fresh auth user** (`auth.users`) with `email_confirm = true`.
3. **Seeds the declared scenario state** into `public.users` and child tables (`user_mediums`, `artworks` + photos, `membership_credits`, `notifications`, `follows`, `referrals`), with `is_test_user = true` on every row.
4. **Generates a Supabase magic-link URL** with `redirectTo = /dev/test-login/finish?next=<scenario.redirect>`.
5. **Browser jumps to the magic link.** Supabase verifies, session cookie is set, control returns to `/dev/test-login/finish`, which exchanges the code for a session and redirects to the scenario's target page.

Re-clicking the same tile produces identical state — idempotent.

---

## Test-user identification

Every row created by the utility is marked **twice**:

1. `public.users.is_test_user = true` (indexed column — preferred filter key)
2. `users.email LIKE '%@test.ftae.local'` (fallback filter + discoverable via SQL)

Aux users (referred artists, followers) follow the same convention.

All production read queries exclude test users — landing stats, Discover search + grid, Following feed, admin dashboard (unless `?test=1` is passed).

---

## Cleanup

Two independent paths, same underlying logic:

1. **In the UI** — "Delete all test users" button appears both at the top (in the reminder banner) and at the bottom of `/dev/test-login`.
2. **CLI** — `node scripts/cleanup-test-users.mjs`. Refuses to run against a Supabase URL containing `freetradeartexchange` unless `--force` is passed.

Both delete every user where `is_test_user = true` OR email matches `%@test.ftae.local`, including their auth row, public row (which cascades to mediums/artworks/photos/credits/notifications/follows/referrals/ips), and storage objects under `avatars/<id>/*` and `artwork-photos/<id>/*`.

**The UI shows a visible reminder banner at the top of the page.** Test users share the live Supabase project; stale rows will inflate counts (the stats queries filter them out, but other dev work may not) until they're deleted.

---

## Adding a new scenario

Append an object to `app/dev/test-login/scenarios.ts`:

```ts
{
  id: 'my-scenario',                    // kebab-case; becomes the email slug
  name: 'Human-readable tile title',
  description: 'One-line description shown under the title.',
  redirect: '/app/following',           // where the browser lands

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

  mediums: ['Oil', 'Watercolor'],       // names; resolved against mediums table

  artworks: [
    {
      title: 'Morning on the Altamaha',
      year: 2024,
      medium: 'Oil on linen',
      dimensions: '24 × 36 in',
      photos: [{ url: 'https://...', photo_type: 'front' }],
    },
  ],

  credits: [{ credit_type: 'founding_member', months_credited: 3 }],

  notifications: [{ type: 'profile_nudge', message: '...', is_read: false }],

  referral: { asReferrer: true, completed: true },   // optional
  followersCount: 2,                                 // optional — N aux users will follow
},
```

The seeder in `app/dev/test-login/actions.ts` handles every field declaratively — no bespoke code per scenario unless you need behavior the schema above doesn't cover.

`scenarioTouchedEmails(scenario)` in `actions.ts` derives the full email list used by auto-cleanup. Aux emails follow the patterns `aux-referred-<id>@test.ftae.local` and `aux-follower-<id>-<n>@test.ftae.local` — if you add new aux categories, extend `scenarioTouchedEmails` accordingly.

---

## Protection layers

**Five independent gates.** Every one of them blocks the route in production; removing any four leaves the route inaccessible on a prod deploy.

1. **Middleware (`middleware.ts`).** `/dev/:path*` is in the matcher; the handler returns a 404 `NextResponse` immediately unless both `NODE_ENV === 'development'` AND `FTAE_ENABLE_DEV_TOOLS === '1'`. This is the architectural gate — requests never reach the page code in prod.
2. **Module-load throw (`_guard.ts`).** Refuses to initialize if `NODE_ENV === 'production'` and the flag is simultaneously `1`. Defends against Vercel env-var misconfiguration.
3. **Runtime `assertDev()`.** Called at the top of the page, server actions, and the finish route handler. Throws if `NODE_ENV === 'production'` or the flag isn't `1`.
4. **Host check (`assertNotProdHost`).** Rejects `freetradeartexchange.com` and `*.vercel.app`. Catches mis-scoped Vercel preview deployments or accidental flag-on-prod situations.
5. **`notFound()` in `page.tsx` + `finish/route.ts`.** Final runtime check before rendering — even if middleware and guards are all somehow bypassed, Next.js responds 404.

Verify prod is still blocked after any change:

```bash
curl -I https://www.freetradeartexchange.com/dev/test-login            # HTTP/2 404
curl -I "https://www.freetradeartexchange.com/dev/test-login/finish?code=x" # HTTP/2 404
```

---

## File map

- `app/dev/test-login/_guard.ts` — env + host guards, test domain constants
- `app/dev/test-login/scenarios.ts` — declarative scenario definitions
- `app/dev/test-login/actions.ts` — server actions (`runScenarioAction`, `cleanupTestUsersAction`) and the seeder
- `app/dev/test-login/_cleanup.ts` — shared cleanup primitives (`deleteUsersById`, `cleanupByEmails`, `cleanupAllTestUsers`)
- `app/dev/test-login/page.tsx` — server entry (404s unless enabled)
- `app/dev/test-login/TestLoginClient.tsx` — menu UI + reminder banner
- `app/dev/test-login/finish/route.ts` — code-exchange redirect target
- `middleware.ts` — layer-1 `/dev/*` gate
- `supabase/migrations/20260420000000_add_is_test_user.sql` — `users.is_test_user` column + index + email-based backfill
- `scripts/cleanup-test-users.mjs` — standalone cleanup CLI

Query files that filter out test users:

- `app/_lib/landing-stats.ts` — founding artists + pieces ready to trade
- `app/_lib/artists.ts` — Discover `searchArtists` (name/username + medium matches)
- `app/_lib/artworks.ts` — Discover artwork grid + Following feed
- `app/_lib/admin.ts` — admin dashboard (togglable via `?test=1`)
