-- One-off backfill: rewrite the welcome notification copy to add the new
-- "Enjoy no per-trade fees, forever!" line and shift the CTA target from
-- "discover artwork you'll love" to "discover artists". The new copy lives
-- in lib/auth-provision.ts as PROFILE_NUDGE_MESSAGE; future inserts use it
-- automatically. This script only touches existing rows.
--
-- Match is exact-string against the prior copy so we don't accidentally
-- rewrite some other profile_nudge that happens to share the type.
--
-- Run via Supabase Dashboard → SQL Editor on prod. Reversible: the prior
-- copy is reproduced verbatim in the WHERE clause if rollback is ever
-- needed (`UPDATE ... SET message = '<old>' WHERE message = '<new>'`).

UPDATE notifications
SET message = E'Welcome to Free Trade Art Exchange!\nThank you for being a founding artist! Enjoy no per-trade fees, forever! Click to discover artists.'
WHERE type = 'profile_nudge'
  AND message = E'Welcome to Free Trade Art Exchange!\nThank you for being a founding artist! Click to discover artwork you\'ll love.';

-- Verify how many rows landed:
-- SELECT count(*) FROM notifications
--   WHERE message = E'Welcome to Free Trade Art Exchange!\nThank you for being a founding artist! Enjoy no per-trade fees, forever! Click to discover artists.';
