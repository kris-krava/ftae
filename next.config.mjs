/** @type {import('next').NextConfig} */
const nextConfig = {
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
