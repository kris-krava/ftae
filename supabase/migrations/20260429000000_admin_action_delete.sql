-- Add 'delete' to admin_action_type so hard-deletion of a user account
-- (Auth row + public row + storage) can be audit-logged in admin_actions.
-- The existing values were 'deactivate', 'activate', 'studio_verify',
-- 'identity_verify' — none captured an irreversible removal.

alter type admin_action_type add value if not exists 'delete';

-- Preserve the audit trail when the target user is deleted.
-- The original FK was `on delete cascade`, which would erase the audit row
-- the moment the user it references is removed — defeating the whole point
-- of logging the action. Switch to `on delete set null` and allow nullable
-- target_user_id so the row survives. The `reason` column already captures
-- the email/username at action time for forensic recovery.

alter table admin_actions
  drop constraint admin_actions_target_user_id_fkey;

alter table admin_actions
  alter column target_user_id drop not null;

alter table admin_actions
  add constraint admin_actions_target_user_id_fkey
    foreign key (target_user_id) references users (id) on delete set null;
