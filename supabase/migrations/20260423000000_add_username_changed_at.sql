-- =============================================================================
-- Track the timestamp of the last successful username change.
-- NULL = the user has never explicitly changed their username via the
-- management flow. The first onboarding pick does NOT set this column, so
-- the user can still go to Edit Username after completing onboarding without
-- hitting the 30-day cooldown. Every successful change-via-magic-link sets
-- this to now(); the cooldown is enforced at >= 30 days from this timestamp.
-- =============================================================================

alter table users
  add column username_changed_at timestamptz;
