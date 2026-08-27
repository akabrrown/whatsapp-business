/** @type {import('next').NextConfig} */
let rawBackend = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
if (!rawBackend.startsWith('http://') && !rawBackend.startsWith('https://')) {
  rawBackend = `https://${rawBackend}`;
}
const backendUrl = rawBackend.replace(/\/+$/, '');

const nextConfig = {
  transpilePackages: ['@rose/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
