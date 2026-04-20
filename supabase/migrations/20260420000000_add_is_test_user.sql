-- =============================================================================
-- Add is_test_user flag to users
-- Used by read queries (landing stats, discover, following, admin, etc.) to
-- filter out development test accounts seeded by the /dev/test-login utility.
-- Defaults to false; indexed for fast filtering on aggregate counts.
-- =============================================================================

alter table users
  add column is_test_user boolean not null default false;

-- Backfill: any rows whose email sits in the dev test domain get flagged.
update users
  set is_test_user = true
  where email ilike '%@test.ftae.local';

create index users_is_test_user_idx on users (is_test_user);
