-- =============================================================================
-- Defense-in-depth: explicit RLS deny policies on append-only tables.
--
-- Postgres RLS denies any operation that has no matching policy, so the
-- previous behavior was already locked down at runtime. The risk these
-- explicit denies guard against is a future migration that adds a permissive
-- `for all` or `for update` policy without realizing the table is meant to be
-- append-only — an explicit `using (false)` makes that intent visible and
-- forces anyone changing it to do so deliberately.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_CREDITS — append-only ledger.
-- ---------------------------------------------------------------------------

create policy "membership_credits: no update"
  on membership_credits for update
  using (false);

create policy "membership_credits: no delete"
  on membership_credits for delete
  using (false);

-- ---------------------------------------------------------------------------
-- TRADE_PROPOSALS — proposals are immutable once created.
-- ---------------------------------------------------------------------------

create policy "trade_proposals: no update"
  on trade_proposals for update
  using (false);

create policy "trade_proposals: no delete"
  on trade_proposals for delete
  using (false);

-- ---------------------------------------------------------------------------
-- ADMIN_ACTIONS — audit log is append-only.
-- ---------------------------------------------------------------------------

create policy "admin_actions: no update"
  on admin_actions for update
  using (false);

create policy "admin_actions: no delete"
  on admin_actions for delete
  using (false);

-- ---------------------------------------------------------------------------
-- MEDIUMS — canonical list managed via migrations only.
--
-- The original "mediums: admin write" policy used `for all`, which let
-- admins UPDATE/DELETE canonical rows from the app. Renaming or deleting a
-- medium would corrupt the discovery filter and break user_mediums FK
-- references. Replace with INSERT-only so admins can add new mediums but
-- not mutate the existing ones; renames/removals must go through a
-- migration with the FK churn handled deliberately.
-- ---------------------------------------------------------------------------

drop policy if exists "mediums: admin write" on mediums;

create policy "mediums: admin insert"
  on mediums for insert
  with check (current_user_role() in ('admin', 'super_admin'));

create policy "mediums: no update"
  on mediums for update
  using (false);

create policy "mediums: no delete"
  on mediums for delete
  using (false);
