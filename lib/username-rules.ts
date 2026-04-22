// Reserved top-level paths that cannot be used as usernames. Mirrors RESERVED in lib/username.ts
// but also covers static/asset paths Next.js may forward to the [username] catch-all.
export const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'app', 'auth', 'onboarding', 'r', 'discover', 'home', 'following',
  'trades', 'profile', 'notifications', 'check-email', 'dev-login',
  'settings', 'signin', 'signup', 'login', 'logout', 'help', 'support',
  'terms', 'privacy', 'about', 'contact', 'www', 'mail', 'static',
  'favicon.ico', 'robots.txt', 'sitemap.xml', '_next',
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
