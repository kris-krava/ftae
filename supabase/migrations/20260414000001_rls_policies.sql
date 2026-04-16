-- =============================================================================
-- FTAE Row Level Security Policies
-- Users can only read/write their own data by default.
-- Public profile data is explicitly granted for read.
-- Admin/super_admin bypass is handled via role checks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: current user's role
-- ---------------------------------------------------------------------------

create or replace function current_user_role()
returns user_role
language sql
stable
as $$
  select role from users where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------

alter table users enable row level security;

-- Anyone can read basic profile data (public profiles)
create policy "users: public read"
  on users for select
  using (is_active = true);

-- Users can update their own row
create policy "users: self update"
  on users for update
  using (id = auth.uid());

-- Admins can update any user row
create policy "users: admin update"
  on users for update
  using (current_user_role() in ('admin', 'super_admin'));

-- New rows are inserted by the auth trigger (service role), not by users directly
-- No insert policy needed for anon/authenticated roles

-- ---------------------------------------------------------------------------
-- USER_IPS
-- ---------------------------------------------------------------------------

alter table user_ips enable row level security;

-- Admins only — users have no business reading IP logs
create policy "user_ips: admin read"
  on user_ips for select
  using (current_user_role() in ('admin', 'super_admin'));

-- Insert via service role (auth trigger) — no user insert policy

-- ---------------------------------------------------------------------------
-- MEDIUMS
-- ---------------------------------------------------------------------------

alter table mediums enable row level security;

-- Public read — everyone can see available mediums
create policy "mediums: public read"
  on mediums for select
  using (true);

-- Admins can manage medium list
create policy "mediums: admin write"
  on mediums for all
  using (current_user_role() in ('admin', 'super_admin'));

-- ---------------------------------------------------------------------------
-- USER_MEDIUMS
-- ---------------------------------------------------------------------------

alter table user_mediums enable row level security;

-- Anyone can read (used for profile display and discovery filters)
create policy "user_mediums: public read"
  on user_mediums for select
  using (true);

-- Users manage their own medium selections
create policy "user_mediums: self write"
  on user_mediums for all
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ARTWORKS
-- ---------------------------------------------------------------------------

alter table artworks enable row level security;

-- Anyone can read active artworks available for trade
create policy "artworks: public read"
  on artworks for select
  using (is_active = true);

-- Users can read all their own artworks (including inactive)
create policy "artworks: self read all"
  on artworks for select
  using (user_id = auth.uid());

-- Users manage their own artworks
create policy "artworks: self write"
  on artworks for all
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ARTWORK_PHOTOS
-- ---------------------------------------------------------------------------

alter table artwork_photos enable row level security;

-- Readable if the parent artwork is readable (active, or owned by user)
create policy "artwork_photos: read via artwork"
  on artwork_photos for select
  using (
    exists (
      select 1 from artworks a
      where a.id = artwork_photos.artwork_id
        and (a.is_active = true or a.user_id = auth.uid())
    )
  );

-- Users manage photos for their own artworks
create policy "artwork_photos: self write"
  on artwork_photos for all
  using (
    exists (
      select 1 from artworks a
      where a.id = artwork_photos.artwork_id
        and a.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- FOLLOWS
-- ---------------------------------------------------------------------------

alter table follows enable row level security;

-- Follow counts are public (for profile display)
create policy "follows: public read"
  on follows for select
  using (true);

-- Users manage their own follows
create policy "follows: self write"
  on follows for all
  using (follower_id = auth.uid());

-- ---------------------------------------------------------------------------
-- REFERRALS
-- ---------------------------------------------------------------------------

alter table referrals enable row level security;

-- Referrers can see their own referral records
create policy "referrals: self read"
  on referrals for select
  using (referrer_user_id = auth.uid());

-- Admins can read all referrals
create policy "referrals: admin read"
  on referrals for select
  using (current_user_role() in ('admin', 'super_admin'));

-- Inserts via service role (application layer writes referral on link click)

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_CREDITS
-- ---------------------------------------------------------------------------

alter table membership_credits enable row level security;

-- Users can read their own credit ledger
create policy "membership_credits: self read"
  on membership_credits for select
  using (user_id = auth.uid());

-- Admins can read all credits
create policy "membership_credits: admin read"
  on membership_credits for select
  using (current_user_role() in ('admin', 'super_admin'));

-- No user insert — credits written by service role only (prevents tampering)

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------

alter table notifications enable row level security;

-- Users read their own notifications only
create policy "notifications: self read"
  on notifications for select
  using (user_id = auth.uid());

-- Users can mark their own notifications as read
create policy "notifications: self update"
  on notifications for update
  using (user_id = auth.uid());

-- Inserts via service role

-- ---------------------------------------------------------------------------
-- ADMIN_ACTIONS
-- ---------------------------------------------------------------------------

alter table admin_actions enable row level security;

-- Admins can read the audit log
create policy "admin_actions: admin read"
  on admin_actions for select
  using (current_user_role() in ('admin', 'super_admin'));

-- Super admins can write (admins cannot write their own audit entries)
create policy "admin_actions: super_admin write"
  on admin_actions for insert
  with check (current_user_role() = 'super_admin');

-- No updates or deletes — append-only

-- ---------------------------------------------------------------------------
-- TRADES
-- ---------------------------------------------------------------------------

alter table trades enable row level security;

-- Parties to the trade can read it
create policy "trades: parties read"
  on trades for select
  using (initiator_id = auth.uid() or recipient_id = auth.uid());

-- Parties can update trades they're part of (status transitions enforced at app layer)
create policy "trades: parties update"
  on trades for update
  using (initiator_id = auth.uid() or recipient_id = auth.uid());

-- Initiator creates the trade
create policy "trades: initiator insert"
  on trades for insert
  with check (initiator_id = auth.uid());

-- Admins can read all trades
create policy "trades: admin read"
  on trades for select
  using (current_user_role() in ('admin', 'super_admin'));

-- ---------------------------------------------------------------------------
-- TRADE_PACKAGES
-- ---------------------------------------------------------------------------

alter table trade_packages enable row level security;

-- Readable by trade parties
create policy "trade_packages: parties read"
  on trade_packages for select
  using (
    exists (
      select 1 from trades t
      where t.id = trade_packages.trade_id
        and (t.initiator_id = auth.uid() or t.recipient_id = auth.uid())
    )
  );

-- Writable by trade parties (adding/modifying their package)
create policy "trade_packages: parties write"
  on trade_packages for all
  using (
    exists (
      select 1 from trades t
      where t.id = trade_packages.trade_id
        and (t.initiator_id = auth.uid() or t.recipient_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- TRADE_PROPOSALS
-- ---------------------------------------------------------------------------

alter table trade_proposals enable row level security;

-- Readable by trade parties
create policy "trade_proposals: parties read"
  on trade_proposals for select
  using (
    exists (
      select 1 from trades t
      where t.id = trade_proposals.trade_id
        and (t.initiator_id = auth.uid() or t.recipient_id = auth.uid())
    )
  );

-- Either party can insert a proposal
create policy "trade_proposals: parties insert"
  on trade_proposals for insert
  with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from trades t
      where t.id = trade_proposals.trade_id
        and (t.initiator_id = auth.uid() or t.recipient_id = auth.uid())
    )
  );

-- No updates — proposals are immutable once created

-- ---------------------------------------------------------------------------
-- PROVENANCE_RECORDS
-- ---------------------------------------------------------------------------

alter table provenance_records enable row level security;

-- Current owner can read provenance of their artworks
create policy "provenance_records: owner read"
  on provenance_records for select
  using (owner_user_id = auth.uid());

-- Previous owner can read too (transparency)
create policy "provenance_records: previous owner read"
  on provenance_records for select
  using (previous_owner_user_id = auth.uid());

-- Written by service role only — no user insert

-- Admins can read all provenance records
create policy "provenance_records: admin read"
  on provenance_records for select
  using (current_user_role() in ('admin', 'super_admin'));
