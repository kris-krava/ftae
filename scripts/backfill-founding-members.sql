-- One-off: grant founding-member status to users who reached 100%
-- profile_completion_pct (under either old OR new weights) but never got
-- the flag flipped. Two ways this can happen:
--
--  1. The user reached 100% via a non-saveStep4Artwork action (e.g., a
--     bio save bumped them across the line). The original code only
--     called tryGrantFoundingMemberCredit from saveStep4Artwork. Code
--     fix in this commit moves the check into recalculateCompletion so
--     ANY 100%-bumping save now grants. This script catches anyone who
--     slipped through before that.
--
--  2. The new weights backfill (scripts/backfill-profile-completion.sql)
--     bumped users to 100% via SQL, which doesn't trigger application
--     code paths.
--
-- IMPORTANT: this only grants when founding-member enrollment is OPEN.
-- Verify before running:
--   SELECT key, value FROM platform_settings
--   WHERE key = 'founding_member_enrollment_open';
-- (should return value = 'true')
--
-- Run via Supabase Dashboard → SQL Editor on prod. Reversible by
-- reverting the inserted membership_credits rows + flipping the flag
-- back, but this is a one-way grant by design.

-- 1. Insert founding_member credit row for each qualifying user.
INSERT INTO membership_credits (user_id, credit_type, months_credited, note)
SELECT u.id,
       'founding_member',
       3,
       'Founding member — backfill grant after weights update'
FROM users u
WHERE u.profile_completion_pct = 100
  AND u.is_founding_member = false
  AND NOT EXISTS (
    SELECT 1 FROM membership_credits mc
    WHERE mc.user_id = u.id AND mc.credit_type = 'founding_member'
  )
  AND (
    SELECT value = 'true'
    FROM platform_settings
    WHERE key = 'founding_member_enrollment_open'
  );

-- 2. Flip the is_founding_member flag for any user who now has the credit
--    but the flag is still false. Order matters: do this AFTER the insert
--    so the credit row exists before the UI re-fetches.
UPDATE users u
SET is_founding_member = true
WHERE u.is_founding_member = false
  AND EXISTS (
    SELECT 1 FROM membership_credits mc
    WHERE mc.user_id = u.id AND mc.credit_type = 'founding_member'
  );

-- Sanity check: how many users were granted?
-- SELECT count(*) FROM users WHERE is_founding_member = true;
