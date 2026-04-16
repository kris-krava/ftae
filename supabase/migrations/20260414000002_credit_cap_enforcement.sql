-- =============================================================================
-- Membership Credit Cap Enforcement
--
-- Two business rules enforced as a single BEFORE INSERT trigger:
--
-- 1. founding_member credit
--    - Issued exactly once per user (no duplicate grants)
--    - months_credited must be exactly 3
--
-- 2. referral_bonus credit
--    - Sum of months_credited across all referral_bonus rows for a user
--      may not exceed 3 (i.e. at most 3 referral months total)
--
-- The trigger is the authoritative guard. Application code should pre-check
-- and show a user-facing message, but the trigger fires regardless of which
-- code path writes the row.
-- =============================================================================

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

    -- Reject if a founding_member row already exists for this user
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

    -- Reject if the grant is not exactly 3 months
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

  -- Any future credit_type not handled above passes through
  return new;
end;
$$;

create trigger membership_credits_cap_enforcement
  before insert on membership_credits
  for each row execute function enforce_membership_credit_rules();
