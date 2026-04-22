import { supabaseAdmin } from './supabase/admin';

const RESERVED = new Set([
  'admin', 'api', 'app', 'auth', 'onboarding', 'r', 'discover', 'home', 'following',
  'trades', 'profile', 'notifications', 'check-email', 'dev-login',
  'settings', 'signin', 'signup', 'login', 'logout', 'help', 'support',
  'terms', 'privacy', 'about', 'contact', 'www', 'mail', 'static',
]);

export function slugifyDisplayName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function fallbackSlugFromEmail(email: string): string {
  const local = email.split('@')[0] || 'artist';
  return slugifyDisplayName(local) || 'artist';
}

export async function generateUniqueUsername(seed: string): Promise<string> {
  let base = slugifyDisplayName(seed);
  if (!base || base.length < 2) base = 'artist';

  let candidate = base;
  if (RESERVED.has(candidate)) candidate = `${base}-1`;

  for (let i = 0; i < 50; i++) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 2}`;
  }

  // Fallback to timestamped candidate — extremely unlikely collision
  return `${base}-${Date.now().toString(36)}`;
}
