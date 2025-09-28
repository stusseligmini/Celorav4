/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['supabase.com', 'celora.net'],
  },
  
  // Basic performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Minimal experimental features for stability
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  
  // Basic security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;