import type { NextConfig } from 'next';

/**
 * On a hosting platform the API base URL must be configured explicitly. The
 * local fallback points at localhost, which resolves to nothing from a build
 * server - so without this guard a misconfigured project deploys "successfully"
 * and then shows an error on every page. Fail the build instead.
 */
function assertDeploymentConfig(): void {
  if (!process.env.VERCEL) return;

  const missing = ['NEXT_PUBLIC_API_URL', 'API_INTERNAL_URL'].filter((key) => !process.env[key]);
  if (missing.length === 0) return;

  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}.\n` +
      'Set them in Vercel under Settings -> Environment Variables to your ' +
      'deployed API, for example https://voyago-api.onrender.com/api/v1 ' +
      '(include the /api/v1 suffix). See docs/deployment.md step 4.',
  );
}

assertDeploymentConfig();

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Demo imagery is served from the Unsplash CDN.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;
