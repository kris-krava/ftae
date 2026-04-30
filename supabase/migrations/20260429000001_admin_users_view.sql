-- View used by the /admin user table. Pre-computes per-user counts so the
-- table can sort + paginate by them without N+1 fetches in app code:
--
--   - art_count       active artworks owned by the user
--   - referral_count  referrals where the user is the referrer
--   - credits_count   membership_credits rows of type referral_bonus
--
-- Service-role only (admin.ts uses supabaseAdmin). Restricting the view's
-- SELECT to service_role keeps it out of anon/authenticated reach in case
-- anyone wires a public client to it later.

create or replace view admin_users_view as
select
  u.id,
  u.name,
  u.email,
  u.username,
  u.created_at,
  u.profile_completion_pct,
  u.is_founding_member,
  u.is_active,
  u.role,
  u.is_test_user,
  coalesce(a.cnt, 0)::int as art_count,
  coalesce(r.cnt, 0)::int as referral_count,
  coalesce(c.cnt, 0)::int as credits_count
from users u
left join (
  select user_id, count(*)::int as cnt
  from artworks
  where is_active = true
  group by user_id
) a on a.user_id = u.id
left join (
  select referrer_user_id, count(*)::int as cnt
  from referrals
  group by referrer_user_id
) r on r.referrer_user_id = u.id
left join (
  select user_id, count(*)::int as cnt
  from membership_credits
  where credit_type = 'referral_bonus'
  group by user_id
) c on c.user_id = u.id;

revoke all on admin_users_view from anon, authenticated;
