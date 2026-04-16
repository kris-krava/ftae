-- =============================================================================
-- Migration 4: Platform Settings + trade_completion trigger update
--
-- Depends on 000003 having committed the trade_completion enum value before
-- this migration runs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PLATFORM_SETTINGS
--
-- Key-value store for runtime configuration that needs to be readable and
-- updatable without a schema migration. Suitable for feature flags and
-- enrollment windows. Not intended for secrets — use environment variables
-- for anything sensitive.
-- ---------------------------------------------------------------------------

create table platform_settings (
  key          varchar primary key,
  value        text not null,
  description  text,
  updated_at   timestamptz not null default now()
);

create trigger platform_settings_updated_at
  before update on platform_settings
  for each row execute function set_updated_at();

alter table platform_settings enable row level security;

-- Anyone authenticated can read settings (used for client-side feature flags)
create policy "platform_settings: authenticated read"
  on platform_settings for select
  to authenticated
  using (true);

-- Only admins can update settings
create policy "platform_settings: admin write"
  on platform_settings for all
  using (current_user_role() in ('admin', 'super_admin'));

-- Seed: founding member enrollment window
insert into platform_settings (key, value, description) values (
  'founding_member_enrollment_open',
  'true',
  'Controls whether new signups are granted founding member status and the associated 3-month credit. Set to false after the enrollment window closes.'
);

-- ---------------------------------------------------------------------------
-- 2. Update enforce_membership_credit_rules to explicitly handle
--    trade_completion — no cap, passes through unconditionally.
--
-- founding_member and referral_bonus rules are unchanged.
-- ---------------------------------------------------------------------------

create or replace function enforce_membership_credit_rules()
returns trigger
language plpgsql
as $$
declare
  existing_count   integer;
  existing_months  integer;
begin

  -- -------------------------------------------------------------------------
  -- Rule 1: founding_member — issued once, exactly 3 months
  -- -------------------------------------------------------------------------
  if new.credit_type = 'founding_member' then

    select count(*)
      into existing_count
      from membership_credits
     where user_id = new.user_id
       and credit_type = 'founding_member';

    if existing_count > 0 then
      raise exception
        'founding member credit already issued for user %',
        new.user_id
        using errcode = 'check_violation';
    end if;

    if new.months_credited <> 3 then
      raise exception
        'founding member credit must be exactly 3 months; got %',
        new.months_credited
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  -- -------------------------------------------------------------------------
  -- Rule 2: referral_bonus — sum may not exceed 3 months total
  -- -------------------------------------------------------------------------
  if new.credit_type = 'referral_bonus' then

    select coalesce(sum(months_credited), 0)
      into existing_months
      from membership_credits
     where user_id = new.user_id
       and credit_type = 'referral_bonus';

    if existing_months + new.months_credited > 3 then
      raise exception
        'referral credit cap exceeded: user % already has % referral month(s) credited; '
        'attempted to add %, cap is 3',
        new.user_id, existing_months, new.months_credited
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  -- -------------------------------------------------------------------------
  -- Rule 3: trade_completion — no cap, unlimited accrual
  -- One credit row per completed trade. Cap logic does not apply.
  -- -------------------------------------------------------------------------
  if new.credit_type = 'trade_completion' then
    return new;
  end if;

  -- Any future credit_type not handled above passes through
  return new;
end;
$$;

-- Trigger binding is unchanged — existing trigger picks up the replaced function automatically
