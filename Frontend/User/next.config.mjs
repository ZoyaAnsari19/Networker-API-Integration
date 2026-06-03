/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  /**
   * In dev, avoid browsers (esp. mobile emulation / Brave) caching HTML that still
   * points at old `/_next/static/*` hashes after `rm -rf .next` or a restart — that mismatch shows as 404 + unstyled UI.
   */
  async headers() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
