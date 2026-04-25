-- =============================================================================
-- pending_email_changes
-- =============================================================================
-- Backs the custom email-change flow that bypasses Supabase Auth's email
-- change pathway. Tracks one in-flight change per user with two confirmation
-- gates (old-side + new-side); when both are non-null we apply the change
-- via supabase.auth.admin.updateUserById and delete the row.
--
-- Rationale: Supabase's "Secure email change" flow ignored our
-- emailRedirectTo on partial confirmations and routed the user to the Site
-- URL with a hash-fragment message we couldn't intercept server-side.
-- Bypassing the auth flow gives us deterministic redirects to /pending and
-- /done plus full control over the (already styled) confirmation emails.

create table pending_email_changes (
  user_id            uuid primary key references users (id) on delete cascade,
  new_email          citext not null,
  old_confirmed_at   timestamptz,
  new_confirmed_at   timestamptz,
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now()
);

create index pending_email_changes_expires_at_idx on pending_email_changes (expires_at);

-- Service-role only. Users never read or write this table directly; the
-- /auth/confirm-email-change/{old,new} route handlers do all access via
-- supabaseAdmin. Enabling RLS without policies blocks all PostgREST access.
alter table pending_email_changes enable row level security;
