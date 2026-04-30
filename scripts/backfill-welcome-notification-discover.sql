-- One-off backfill: rewrite the welcome notification copy + add the
-- /app/discover action_url so the entire row becomes clickable. The new
-- copy lives in lib/auth-provision.ts as PROFILE_NUDGE_MESSAGE; future
-- inserts use it automatically. This script only touches existing rows.
--
-- Match is exact-string against the previous copy so we don't accidentally
-- rewrite some other profile_nudge that happens to share the type.
--
-- Run via Supabase Dashboard → SQL Editor on prod. Reversible: the prior
-- copy is reproduced verbatim in the WHERE clause if rollback is ever
-- needed (`UPDATE ... SET message = '<old>', action_url = NULL WHERE message = '<new>'`).

UPDATE notifications
SET message = E'Welcome to Free Trade Art Exchange!\nThank you for being a founding artist! Click to discover artwork you\'ll love.',
    action_url = '/app/discover'
WHERE type = 'profile_nudge'
  AND message = E'Welcome to Free Trade Art Exchange!\nAdd your first piece of art to officially become a founding artist.';

-- Verify how many rows landed:
-- SELECT count(*) FROM notifications
--   WHERE message = E'Welcome to Free Trade Art Exchange!\nThank you for being a founding artist! Click to discover artwork you\'ll love.'
--     AND action_url = '/app/discover';
