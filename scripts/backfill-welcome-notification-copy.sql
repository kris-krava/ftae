-- One-off backfill: rewrite the welcome notification copy on rows that
-- were inserted before the constant changed. The new copy lives in
-- lib/auth-provision.ts as PROFILE_NUDGE_MESSAGE; future inserts use it
-- automatically. This script only touches existing rows.
--
-- Match is exact-string against the previous copy so we don't accidentally
-- rewrite some other profile_nudge that happens to share the type.
--
-- Run via Supabase Dashboard → SQL Editor on prod. Reversible: the prior
-- copy is reproduced verbatim in the WHERE clause if rollback is ever
-- needed (`UPDATE ... SET message = '<old>' WHERE message = '<new>'`).

UPDATE notifications
SET message = E'Welcome to Free Trade Art Exchange!\nAdd your first piece of art to officially become a founding artist.'
WHERE type = 'profile_nudge'
  AND message = E'Your profile is looking good\nAdd more work you’d love to trade.';

-- Verify how many rows landed:
-- SELECT count(*) FROM notifications
--   WHERE message = E'Welcome to Free Trade Art Exchange!\nAdd your first piece of art to officially become a founding artist.';
