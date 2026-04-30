-- One-off: recompute profile_completion_pct for every user under the new
-- weights (links no longer counts; artwork bumped 15 → 20). Run once after
-- the deploy that ships lib/profile-completion.ts changes; subsequent
-- onboarding actions / art uploads will re-run computeCompletion() and
-- keep individual rows fresh going forward.
--
-- The column stays in [0, 100]. No founding-member side effects: founding
-- status is a one-way grant and existing rows aren't touched here.
--
-- Run via Supabase Dashboard → SQL Editor on prod. Reversible only by
-- replaying the old weights, which we'd no longer want; if rolled back,
-- mismatches with code logic would self-heal on next save.

UPDATE users u
SET profile_completion_pct = (
    CASE WHEN u.avatar_url IS NOT NULL AND u.avatar_url <> '' THEN 20 ELSE 0 END
  + CASE WHEN NULLIF(BTRIM(u.name), '') IS NOT NULL THEN 15 ELSE 0 END
  + CASE WHEN NULLIF(BTRIM(u.location_city), '') IS NOT NULL THEN 15 ELSE 0 END
  + CASE WHEN (SELECT count(*) FROM user_mediums WHERE user_id = u.id) > 0 THEN 15 ELSE 0 END
  + CASE WHEN NULLIF(BTRIM(u.bio), '') IS NOT NULL THEN 15 ELSE 0 END
  + CASE WHEN (
      SELECT count(*) FROM artworks
      WHERE user_id = u.id AND is_active = true
    ) > 0 THEN 20 ELSE 0 END
);

-- Sanity check: distribution after backfill.
-- SELECT profile_completion_pct, count(*) FROM users GROUP BY profile_completion_pct ORDER BY profile_completion_pct;
