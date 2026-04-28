-- =============================================================================
-- Extend the stale-signup grace from 3 days to 7 days.
--
-- The original window (20260422000000_purge_stale_signups.sql) was tuned
-- before the autosave-driven step 1 form, which can leave a `users` row with
-- name/location/avatar still null for users who opened step 1 and abandoned.
-- 7 days gives a more forgiving "come back and finish" window before we drop
-- the row + its `auth.users` partner. Predicate is unchanged: anyone who
-- never accepted Terms (i.e. never finalized step 1) is eligible.
-- =============================================================================

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
      and created_at < now() - interval '7 days'
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
