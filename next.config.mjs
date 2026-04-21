/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Dynamic routes (e.g. /[username]) change frequently — a user adds art,
    // follows someone, the scenario runner re-seeds with a new user id. The
    // default 30s client-side router cache masks those changes until it ages
    // out. Zero it so navigation always reflects current server state.
    staleTimes: { dynamic: 0 },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'agwulzsczrrjyhyjhwgw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'agwulzsczrrjyhyjhwgw.supabase.co',
        pathname: '/storage/v1/render/image/public/**',
      },
      // picsum.photos is only referenced by /dev/test-login seeded data.
      // Harmless in prod — no real user profile ever points here because
      // the dev utility is 404'd on production deploys.
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
