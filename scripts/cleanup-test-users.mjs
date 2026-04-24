#!/usr/bin/env node
/**
 * Standalone cleanup for FTAE dev test users.
 *
 * Independent of the Next.js app so it still works if /dev/test-login is
 * disabled, removed, or broken. Reads env from .env.local.
 *
 * Usage:
 *   node scripts/cleanup-test-users.mjs
 *
 * Refuses to run against a Supabase URL that looks like production. If your
 * dev and prod share one Supabase project, pass --force to override.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const TEST_DOMAIN = '@test.ftae.local';

function loadDotEnv() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  } catch {
    // silently ignore; env may already be set in CI etc.
  }
}

loadDotEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const force = process.argv.includes('--force');

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Hardcoded prod project ref — the only thing that reliably identifies the
// prod project across URL formats. The previous substring check
// (/freetradeartexchange/) never matched the actual prod URL and gave a
// false sense of safety.
const PROD_PROJECT_REF = 'agwulzsczrrjyhyjhwgw';
if (!force && url.includes(`${PROD_PROJECT_REF}.supabase.co`)) {
  console.error('Refusing to run against', url, '— this is the production project.');
  console.error('Point .env.local at a dev project, or re-run with --force if you really mean it.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// remove() does not recurse into folders — list returns child entries
// (folders have no metadata, files have metadata.size). Walk the tree so
// nested artwork photos are collected as leaf paths.
async function listAllFiles(admin, bucket, root) {
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const prefix = queue.shift();
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(prefix, { limit: 1000, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const fullPath = `${prefix}/${entry.name}`;
        if (entry.metadata && typeof entry.metadata.size === 'number') {
          out.push(fullPath);
        } else {
          queue.push(fullPath);
        }
      }
      if (data.length < 1000) break;
      offset += data.length;
    }
  }
  return out;
}

async function listAllTestUsers() {
  const out = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && u.email.toLowerCase().endsWith(TEST_DOMAIN)) {
        out.push({ id: u.id, email: u.email });
      }
    }
    if (users.length < perPage) break;
    page += 1;
  }
  return out;
}

async function main() {
  const testUsers = await listAllTestUsers();

  // Primary: rows flagged via users.is_test_user
  const { data: flagged } = await admin
    .from('users')
    .select('id, email')
    .eq('is_test_user', true);
  for (const r of flagged ?? []) {
    if (!testUsers.find((t) => t.id === r.id)) testUsers.push(r);
  }

  // Fallback: email-domain matches (picks up any row that missed the flag)
  const { data: orphans } = await admin
    .from('users')
    .select('id, email')
    .like('email', `%${TEST_DOMAIN}`);
  for (const o of orphans ?? []) {
    if (!testUsers.find((t) => t.id === o.id)) testUsers.push(o);
  }

  console.log(`Found ${testUsers.length} test user(s):`);
  for (const u of testUsers) console.log(`  ${u.id}  ${u.email}`);
  if (testUsers.length === 0) return;

  let authDeleted = 0;
  let pubDeleted = 0;
  const errors = [];

  for (const u of testUsers) {
    for (const bucket of ['avatars', 'artwork-photos']) {
      const paths = await listAllFiles(admin, bucket, u.id);
      if (paths.length > 0) {
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (error) errors.push(`${bucket} remove ${u.id}: ${error.message}`);
      }
    }

    const { error: pubErr } = await admin.from('users').delete().eq('id', u.id);
    if (pubErr) errors.push(`users delete ${u.id}: ${pubErr.message}`);
    else pubDeleted += 1;

    const { error: authErr } = await admin.auth.admin.deleteUser(u.id);
    if (authErr) errors.push(`auth.admin.deleteUser ${u.id}: ${authErr.message}`);
    else authDeleted += 1;
  }

  console.log(`\nDeleted ${authDeleted} auth user(s), ${pubDeleted} profile row(s).`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  ${e}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
