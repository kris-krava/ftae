-- =============================================================================
-- Purge stale signups
--
-- A user who clicks the magic link triggers a row in `auth.users` plus a
-- public.users row. If they never accept the Terms + Privacy on Step 1
-- (terms_accepted_at remains null), we should not retain their email
-- indefinitely. After a 3-day grace window, the row is purged from both
-- public.users (cascading to dependent rows) and auth.users.
--
-- Implementation:
--   - SECURITY DEFINER function owned by `postgres` so it can touch auth.users.
--   - Scheduled daily via pg_cron.
--   - Idempotent — safe to run repeatedly.
--   - Users who accepted ToS at any point are never purged, regardless of
--     subsequent activity.
-- =============================================================================

create extension if not exists pg_cron with schema extensions;

create or replace function public.purge_stale_signups()
returns integer
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  purged_count integer;
begin
  with purgees as (
    delete from public.users
    where terms_accepted_at is null
      and created_at < now() - interval '3 days'
    returning id
  ),
  auth_purge as (
    delete from auth.users
    where id in (select id from purgees)
    returning id
  )
  select count(*) into purged_count from auth_purge;

  return coalesce(purged_count, 0);
end;
$$;

revoke all on function public.purge_stale_signups() from public;

select cron.schedule(
  'purge-stale-signups-daily',
  '17 4 * * *',
  $$ select public.purge_stale_signups(); $$
);
