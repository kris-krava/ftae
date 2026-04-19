-- =============================================================================
-- Add terms_accepted_at column to users
-- Timestamp set when the user ticks the Terms + Privacy agreement on Step 1.
-- Nullable; existing rows keep null. Set once, never overwritten.
-- =============================================================================

alter table users
  add column terms_accepted_at timestamptz;
