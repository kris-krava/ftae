-- =============================================================================
-- Add username column to users
-- Unique, indexed, required. Generated server-side during auth callback.
-- =============================================================================

alter table users
  add column username citext;

-- Backfill existing rows with a placeholder derived from id to satisfy NOT NULL
-- (safe because the column is newly added and no production users exist yet).
update users
  set username = 'user-' || substring(id::text from 1 for 8)
  where username is null;

alter table users
  alter column username set not null;

create unique index users_username_key on users (username);
