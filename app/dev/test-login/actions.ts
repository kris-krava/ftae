'use server';

import 'server-only';
import { headers } from 'next/headers';
import { randomBytes } from 'crypto';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateUniqueUsername } from '@/lib/username';
import { assertDev, assertNotProdHost, TEST_EMAIL_DOMAIN } from './_guard';
import { getScenario, type Scenario, type ScenarioArtwork, type ScenarioDiscoverPeer } from './scenarios';
import { cleanupAllTestUsers, cleanupByEmails, type CleanupReport } from './_cleanup';

interface RunResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function runScenarioAction(scenarioId: string): Promise<RunResult> {
  assertDev();
  const host = headers().get('host');
  assertNotProdHost(host);

  const scenario = getScenario(scenarioId);
  if (!scenario) return { ok: false, error: `Unknown scenario: ${scenarioId}` };

  const email = `scenario-${scenario.id}@${TEST_EMAIL_DOMAIN}`;

  try {
    // Auto-cleanup on re-run: before seeding fresh state, fully delete any
    // prior test users this scenario created (primary + aux). Keeps the DB
    // free of stale test rows between sessions.
    if (scenario.cleanupAllBefore) {
      await cleanupAllTestUsers(supabaseAdmin);
    } else {
      const emailsToWipe = scenarioTouchedEmails(scenario);
      await cleanupByEmails(supabaseAdmin, emailsToWipe);
    }

    const userId = await ensureAuthUser(email);
    await seedScenario(scenario, userId, email);

    const origin = `${hostIsSecure(host) ? 'https' : 'http'}://${host ?? 'localhost:3000'}`;
    const redirectTo = `${origin}/dev/test-login/finish?next=${encodeURIComponent(scenario.redirect)}`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) {
      return { ok: false, error: error?.message ?? 'Could not generate login link.' };
    }
    return { ok: true, url: data.properties.action_link };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function cleanupTestUsersAction(): Promise<CleanupReport> {
  assertDev();
  assertNotProdHost(headers().get('host'));
  return await cleanupAllTestUsers(supabaseAdmin);
}

function hostIsSecure(host: string | null): boolean {
  if (!host) return false;
  return !host.startsWith('localhost') && !host.startsWith('127.0.0.1');
}

async function ensureAuthUser(email: string): Promise<string> {
  // Look up first; create if missing. Idempotent.
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const match = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (!data || data.users.length < 200) break;
    page += 1;
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { test_user: true },
  });
  if (createErr || !created?.user) throw new Error(`createUser: ${createErr?.message ?? 'no user'}`);
  return created.user.id;
}

async function seedScenario(scenario: Scenario, userId: string, email: string): Promise<void> {
  const p = scenario.profile ?? {};

  // Upsert public.users row.
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, username, referral_code')
    .eq('id', userId)
    .maybeSingle();

  const username = existing?.username ?? (await generateUniqueUsername(email.split('@')[0]));
  const referralCode = existing?.referral_code ?? randomBytes(16).toString('hex');

  const row = {
    id: userId,
    email,
    username,
    referral_code: referralCode,
    name: p.name ?? null,
    location_city: p.location_city ?? null,
    bio: p.bio ?? null,
    website_url: p.website_url ?? null,
    social_platform: p.social_platform ?? null,
    social_handle: p.social_handle ?? null,
    avatar_url: p.avatar_url ?? null,
    is_founding_member: p.is_founding_member ?? false,
    is_active: true,
    is_test_user: true,
    profile_completion_pct: p.profile_completion_pct ?? 0,
  };

  if (existing) {
    const { error } = await supabaseAdmin.from('users').update(row).eq('id', userId);
    if (error) throw new Error(`users update: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin.from('users').insert(row);
    if (error) throw new Error(`users insert: ${error.message}`);
  }

  // Mediums
  if (scenario.mediums && scenario.mediums.length) {
    const { data: mediumRows } = await supabaseAdmin
      .from('mediums')
      .select('id, name')
      .in('name', scenario.mediums);
    const links = (mediumRows ?? []).map((m) => ({ user_id: userId, medium_id: m.id as string }));
    if (links.length) await supabaseAdmin.from('user_mediums').insert(links);
  }

  // Artworks + photos. Test artworks use is_trade_available=false so they
  // don't pollute the landing "Pieces Ready to Trade" counter.
  for (const art of scenario.artworks ?? []) {
    await insertArtwork(userId, art);
  }

  // Credits
  if (scenario.credits && scenario.credits.length) {
    const credits = scenario.credits.map((c) => ({
      user_id: userId,
      credit_type: c.credit_type,
      months_credited: c.months_credited,
      note: c.note ?? 'Test scenario credit',
    }));
    const { error } = await supabaseAdmin.from('membership_credits').insert(credits);
    if (error) throw new Error(`membership_credits insert: ${error.message}`);
  }

  // Notifications
  if (scenario.notifications && scenario.notifications.length) {
    const notifs = scenario.notifications.map((n) => ({
      user_id: userId,
      type: n.type,
      message: n.message,
      is_read: n.is_read ?? false,
    }));
    await supabaseAdmin.from('notifications').insert(notifs);
  }

  // Referral (primary user is the referrer of an auxiliary test user)
  if (scenario.referral?.asReferrer) {
    const aux = await ensureAuxUser(`aux-referred-${scenario.id}@${TEST_EMAIL_DOMAIN}`);
    const referralRow = {
      referrer_user_id: userId,
      referred_user_id: aux.userId,
      referral_code: referralCode,
      signup_completed_at: new Date().toISOString(),
      profile_completed_at: scenario.referral.completed ? new Date().toISOString() : null,
      credit_issued: scenario.referral.completed,
    };
    await supabaseAdmin.from('referrals').insert(referralRow);

    if (scenario.referral.completed) {
      // Link the existing referral_bonus credit (if any was seeded above) to this referral.
      const { data: creditRow } = await supabaseAdmin
        .from('membership_credits')
        .select('id')
        .eq('user_id', userId)
        .eq('credit_type', 'referral_bonus')
        .is('source_referral_id', null)
        .limit(1)
        .maybeSingle();
      if (creditRow) {
        const { data: ref } = await supabaseAdmin
          .from('referrals')
          .select('id')
          .eq('referrer_user_id', userId)
          .eq('referred_user_id', aux.userId)
          .maybeSingle();
        if (ref?.id) {
          await supabaseAdmin
            .from('membership_credits')
            .update({ source_referral_id: ref.id })
            .eq('id', creditRow.id);
        }
      }
    }
  }

  // Followers (aux users who follow the primary)
  if (scenario.followersCount && scenario.followersCount > 0) {
    for (let i = 0; i < scenario.followersCount; i += 1) {
      const aux = await ensureAuxUser(`aux-follower-${scenario.id}-${i}@${TEST_EMAIL_DOMAIN}`);
      await supabaseAdmin
        .from('follows')
        .insert({ follower_id: aux.userId, following_id: userId });
    }
  }

  // Discover peers (aux artist users each seeded with one artwork)
  if (scenario.discoverPeers && scenario.discoverPeers.length) {
    for (let i = 0; i < scenario.discoverPeers.length; i += 1) {
      await seedDiscoverPeer(scenario.id, i, scenario.discoverPeers[i]);
    }
  }
}

async function seedDiscoverPeer(
  scenarioId: string,
  index: number,
  peer: ScenarioDiscoverPeer,
): Promise<void> {
  const email = `aux-peer-${scenarioId}-${index}@${TEST_EMAIL_DOMAIN}`;
  const peerUserId = await ensureAuthUser(email);

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, username, referral_code')
    .eq('id', peerUserId)
    .maybeSingle();
  const username = existing?.username ?? (await generateUniqueUsername(email.split('@')[0]));
  const referralCode = existing?.referral_code ?? randomBytes(16).toString('hex');

  const row = {
    id: peerUserId,
    email,
    username,
    referral_code: referralCode,
    name: peer.name,
    location_city: peer.location_city,
    avatar_url: peer.avatar_url,
    is_active: true,
    is_test_user: true,
    profile_completion_pct: 100,
  };
  if (existing) {
    await supabaseAdmin.from('users').update(row).eq('id', peerUserId);
  } else {
    await supabaseAdmin.from('users').insert(row);
  }

  const { data: mediumRow } = await supabaseAdmin
    .from('mediums')
    .select('id')
    .eq('name', peer.medium)
    .maybeSingle();
  if (mediumRow) {
    await supabaseAdmin
      .from('user_mediums')
      .upsert({ user_id: peerUserId, medium_id: mediumRow.id as string });
  }

  await insertArtwork(peerUserId, peer.artwork);
}

async function insertArtwork(userId: string, art: ScenarioArtwork): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('artworks')
    .insert({
      user_id: userId,
      title: art.title,
      year: art.year,
      medium: art.medium,
      dimension_unit: 'in',
      is_trade_available: false, // keep test artworks out of prod stats counter
      is_active: true,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`artworks insert: ${error?.message}`);

  for (let i = 0; i < (art.photos ?? []).length; i += 1) {
    const photo = art.photos![i];
    await supabaseAdmin.from('artwork_photos').insert({
      artwork_id: data.id,
      url: photo.url,
      photo_type: photo.photo_type,
      sort_order: i,
    });
  }
}

async function ensureAuxUser(email: string): Promise<{ userId: string }> {
  const authId = await ensureAuthUser(email);
  // Minimal public.users row so cascading FKs satisfy. Skip if already present.
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', authId)
    .maybeSingle();
  if (!existing) {
    const username = await generateUniqueUsername(email.split('@')[0]);
    await supabaseAdmin.from('users').insert({
      id: authId,
      email,
      username,
      referral_code: randomBytes(16).toString('hex'),
      is_active: true,
      is_test_user: true,
      profile_completion_pct: 0,
    });
  }
  return { userId: authId };
}

function scenarioTouchedEmails(scenario: Scenario): string[] {
  const emails = [`scenario-${scenario.id}@${TEST_EMAIL_DOMAIN}`];
  if (scenario.referral?.asReferrer) {
    emails.push(`aux-referred-${scenario.id}@${TEST_EMAIL_DOMAIN}`);
  }
  if (scenario.followersCount && scenario.followersCount > 0) {
    for (let i = 0; i < scenario.followersCount; i += 1) {
      emails.push(`aux-follower-${scenario.id}-${i}@${TEST_EMAIL_DOMAIN}`);
    }
  }
  if (scenario.discoverPeers && scenario.discoverPeers.length > 0) {
    for (let i = 0; i < scenario.discoverPeers.length; i += 1) {
      emails.push(`aux-peer-${scenario.id}-${i}@${TEST_EMAIL_DOMAIN}`);
    }
  }
  return emails;
}
