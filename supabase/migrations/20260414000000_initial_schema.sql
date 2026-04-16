-- =============================================================================
-- FTAE Initial Schema
-- Free Trade Art Exchange — Production Database
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive text for email

-- ---------------------------------------------------------------------------
-- Enum Types
-- ---------------------------------------------------------------------------

create type user_role as enum ('member', 'admin', 'super_admin');

create type user_ip_event as enum ('signup', 'login', 'profile_update');

create type social_platform as enum (
  'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'pinterest', 'linkedin'
);

create type artwork_condition as enum (
  'excellent', 'good', 'fair', 'needs_restoration'
);

create type dimension_unit as enum ('in', 'cm');

create type artwork_photo_type as enum ('front', 'back', 'detail', 'shipping');

create type credit_type as enum ('founding_member', 'referral_bonus');

create type notification_type as enum (
  'profile_nudge',
  'referral_joined',
  'referral_completed',
  'trade_proposal',
  'trade_match',
  'system'
);

create type admin_action_type as enum (
  'deactivate', 'activate', 'studio_verify', 'identity_verify'
);

create type trade_status as enum (
  'proposed',
  'countered',
  'matched',
  'initiator_shipped',
  'recipient_shipped',
  'initiator_confirmed',
  'recipient_confirmed',
  'completed',
  'cancelled',
  'disputed'
);

create type shipping_terms as enum (
  'each_pays_own',
  'initiator_pays_all',
  'recipient_pays_all',
  'split',
  'custom'
);

create type trade_side as enum ('initiator', 'recipient');

create type proposal_status as enum ('pending', 'accepted', 'declined', 'countered');

-- ---------------------------------------------------------------------------
-- Timestamp trigger
-- Sets updated_at automatically on any row update.
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------

create table users (
  id                      uuid primary key default gen_random_uuid(),
  email                   citext unique not null,
  name                    varchar,
  location_city           varchar,
  location_region         varchar,
  location_country        varchar,
  bio                     varchar(160),
  avatar_url              text,
  website_url             text,
  social_platform         social_platform,
  social_handle           varchar,
  role                    user_role not null default 'member',
  is_active               boolean not null default true,
  is_founding_member      boolean not null default false,
  identity_verified       boolean not null default false,
  studio_verified         boolean not null default false,
  profile_completion_pct  integer not null default 0 check (profile_completion_pct between 0 and 100),
  referral_code           varchar unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();

create index users_role_idx on users (role);
create index users_is_active_idx on users (is_active);
create index users_is_founding_member_idx on users (is_founding_member);
create index users_referral_code_idx on users (referral_code);

-- ---------------------------------------------------------------------------
-- USER_IPS
-- ---------------------------------------------------------------------------

create table user_ips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  ip_address  inet not null,
  event_type  user_ip_event not null,
  created_at  timestamptz not null default now()
);

create index user_ips_user_id_idx on user_ips (user_id);
create index user_ips_ip_address_idx on user_ips (ip_address);
create index user_ips_created_at_idx on user_ips (created_at);

-- ---------------------------------------------------------------------------
-- MEDIUMS
-- ---------------------------------------------------------------------------

create table mediums (
  id          uuid primary key default gen_random_uuid(),
  name        varchar not null unique,
  sort_order  integer not null default 0
);

create index mediums_sort_order_idx on mediums (sort_order);

-- Seed canonical medium values
insert into mediums (name, sort_order) values
  ('Oil',             1),
  ('Acrylic',         2),
  ('Watercolor',      3),
  ('Gouache',         4),
  ('Pastel',          5),
  ('Charcoal',        6),
  ('Graphite',        7),
  ('Ink',             8),
  ('Printmaking',     9),
  ('Photography',    10),
  ('Sculpture',      11),
  ('Ceramic',        12),
  ('Textile',        13),
  ('Mixed Media',    14),
  ('Digital',        15),
  ('Collage',        16),
  ('Drawing',        17),
  ('Encaustic',      18),
  ('Resin',          19),
  ('Other',          99);

-- ---------------------------------------------------------------------------
-- USER_MEDIUMS
-- ---------------------------------------------------------------------------

create table user_mediums (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  medium_id   uuid not null references mediums (id) on delete cascade,
  unique (user_id, medium_id)
);

create index user_mediums_user_id_idx on user_mediums (user_id);
create index user_mediums_medium_id_idx on user_mediums (medium_id);

-- ---------------------------------------------------------------------------
-- ARTWORKS
-- ---------------------------------------------------------------------------

create table artworks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users (id) on delete cascade,
  title               varchar,
  year                integer check (year between 1000 and extract(year from now())::integer + 1),
  medium              varchar,
  height              decimal(8, 2),
  width               decimal(8, 2),
  depth               decimal(8, 2),
  dimension_unit      dimension_unit not null default 'in',
  condition           artwork_condition,
  declared_value      decimal(10, 2),
  artist_statement    text,
  is_trade_available  boolean not null default true,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger artworks_updated_at
  before update on artworks
  for each row execute function set_updated_at();

create index artworks_user_id_idx on artworks (user_id);
create index artworks_is_trade_available_idx on artworks (is_trade_available);
create index artworks_is_active_idx on artworks (is_active);

-- ---------------------------------------------------------------------------
-- ARTWORK_PHOTOS
-- ---------------------------------------------------------------------------

create table artwork_photos (
  id          uuid primary key default gen_random_uuid(),
  artwork_id  uuid not null references artworks (id) on delete cascade,
  url         text not null,
  photo_type  artwork_photo_type not null default 'front',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index artwork_photos_artwork_id_idx on artwork_photos (artwork_id, sort_order);

-- ---------------------------------------------------------------------------
-- FOLLOWS
-- ---------------------------------------------------------------------------

create table follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references users (id) on delete cascade,
  following_id  uuid not null references users (id) on delete cascade,
  is_queued     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_follower_id_idx on follows (follower_id);
create index follows_following_id_idx on follows (following_id);
create index follows_is_queued_idx on follows (is_queued) where is_queued = true;

-- ---------------------------------------------------------------------------
-- REFERRALS
-- ---------------------------------------------------------------------------

create table referrals (
  id                      uuid primary key default gen_random_uuid(),
  referrer_user_id        uuid not null references users (id) on delete cascade,
  referred_user_id        uuid references users (id) on delete set null,
  referral_code           varchar not null,
  clicked_at              timestamptz not null default now(),
  signup_completed_at     timestamptz,
  profile_completed_at    timestamptz,
  credit_issued           boolean not null default false,
  created_at              timestamptz not null default now()
);

create index referrals_referrer_user_id_idx on referrals (referrer_user_id);
create index referrals_referred_user_id_idx on referrals (referred_user_id);
create index referrals_referral_code_idx on referrals (referral_code);
create index referrals_credit_issued_idx on referrals (credit_issued) where credit_issued = false;

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_CREDITS
-- Append-only ledger. Never update or delete rows.
-- Total free months = sum(months_credited) for a user_id.
-- Credit types and their caps (enforced by trigger in 000002, updated in 000003):
--   founding_member:  issued exactly once per user, months_credited must be 3
--   referral_bonus:   sum of months_credited per user may not exceed 3
--   trade_completion: no cap — one row per completed trade, unlimited accrual
-- ---------------------------------------------------------------------------

create table membership_credits (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users (id) on delete cascade,
  credit_type         credit_type not null,
  months_credited     integer not null check (months_credited > 0),
  source_referral_id  uuid references referrals (id) on delete set null,
  note                text,
  created_at          timestamptz not null default now()
);

create index membership_credits_user_id_idx on membership_credits (user_id);
create index membership_credits_credit_type_idx on membership_credits (credit_type);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  type        notification_type not null,
  message     text not null,
  is_read     boolean not null default false,
  action_url  text,
  created_at  timestamptz not null default now()
);

create index notifications_user_id_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where is_read = false;

-- ---------------------------------------------------------------------------
-- ADMIN_ACTIONS
-- Append-only audit log. Never update or delete rows.
-- ---------------------------------------------------------------------------

create table admin_actions (
  id               uuid primary key default gen_random_uuid(),
  admin_user_id    uuid not null references users (id) on delete cascade,
  target_user_id   uuid not null references users (id) on delete cascade,
  action_type      admin_action_type not null,
  reason           text,
  created_at       timestamptz not null default now()
);

create index admin_actions_admin_user_id_idx on admin_actions (admin_user_id);
create index admin_actions_target_user_id_idx on admin_actions (target_user_id);

-- ---------------------------------------------------------------------------
-- TRADES
-- ---------------------------------------------------------------------------

create table trades (
  id                        uuid primary key default gen_random_uuid(),
  initiator_id              uuid not null references users (id) on delete cascade,
  recipient_id              uuid not null references users (id) on delete cascade,
  status                    trade_status not null default 'proposed',
  shipping_terms            shipping_terms,
  shipping_terms_custom     text,
  initiator_tracking        varchar,
  recipient_tracking        varchar,
  initiator_delivered_at    timestamptz,
  recipient_delivered_at    timestamptz,
  obligation_deadline       timestamptz,
  completed_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (initiator_id <> recipient_id)
);

create trigger trades_updated_at
  before update on trades
  for each row execute function set_updated_at();

create index trades_initiator_id_idx on trades (initiator_id);
create index trades_recipient_id_idx on trades (recipient_id);
create index trades_status_idx on trades (status);

-- ---------------------------------------------------------------------------
-- TRADE_PACKAGES
-- ---------------------------------------------------------------------------

create table trade_packages (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references trades (id) on delete cascade,
  artwork_id  uuid not null references artworks (id) on delete cascade,
  side        trade_side not null,
  created_at  timestamptz not null default now()
);

create index trade_packages_trade_id_idx on trade_packages (trade_id);
create index trade_packages_artwork_id_idx on trade_packages (artwork_id);

-- ---------------------------------------------------------------------------
-- TRADE_PROPOSALS
-- ---------------------------------------------------------------------------

create table trade_proposals (
  id              uuid primary key default gen_random_uuid(),
  trade_id        uuid not null references trades (id) on delete cascade,
  proposed_by     uuid not null references users (id) on delete cascade,
  round           integer not null default 1 check (round >= 1),
  message         text,
  shipping_terms  shipping_terms,
  status          proposal_status not null default 'pending',
  created_at      timestamptz not null default now()
);

create index trade_proposals_trade_id_idx on trade_proposals (trade_id, round);
create index trade_proposals_proposed_by_idx on trade_proposals (proposed_by);

-- ---------------------------------------------------------------------------
-- PROVENANCE_RECORDS
-- Immutable snapshot written at trade completion.
-- record_data captures artwork details, photos, declared value, artist
-- statement, and verified identities of both parties at the moment of trade.
-- ---------------------------------------------------------------------------

create table provenance_records (
  id                      uuid primary key default gen_random_uuid(),
  trade_id                uuid not null references trades (id) on delete cascade,
  artwork_id              uuid not null references artworks (id) on delete cascade,
  owner_user_id           uuid not null references users (id) on delete cascade,
  previous_owner_user_id  uuid not null references users (id) on delete cascade,
  record_data             jsonb not null,
  generated_at            timestamptz not null default now()
);

create index provenance_records_trade_id_idx on provenance_records (trade_id);
create index provenance_records_artwork_id_idx on provenance_records (artwork_id);
create index provenance_records_owner_user_id_idx on provenance_records (owner_user_id);
