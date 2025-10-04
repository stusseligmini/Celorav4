/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'supabase.com',
      },
      {
        protocol: 'https',
        hostname: 'celora.net',
      },
    ],
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Next.js 15 configuration
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  
  // Server external packages (moved from experimental in Next.js 15)
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Migrate from deprecated experimental.turbo to turbopack
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Enable strict TypeScript checking for better code quality
  typescript: {
    ignoreBuildErrors: false,
  },
  // Disable ESLint during production builds on CI to avoid config format mismatches
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enhanced security headers
  async headers() {
    return [
      // AGGRESSIVE cache-busting for mobile browsers
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'X-Cache-Control', value: 'no-cache' },
        ],
      },
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },

  // Domain redirects: www to non-www for canonical domain
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.celora.net' }],
        destination: 'https://celora.net/:path*',
        permanent: true,
      },
    ];
  },

  // Webpack configuration for better module resolution and performance
  webpack: (config, { isServer, dev }) => {
    // Optimize for client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Optimize webpack cache to reduce serialization warnings
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        compression: 'gzip',
      };
      
      // Optimize chunk splitting to reduce large strings in cache
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 244000, // Keep chunks under 244KB to avoid serialization warnings
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 10,
            maxSize: 200000,
          },
        },
      };
    }
    
    // Add externals for Edge Runtime compatibility
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }
    
    return config;
  },
};

module.exports = nextConfig;