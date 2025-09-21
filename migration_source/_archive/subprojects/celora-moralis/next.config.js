/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    MORALIS_API_KEY: process.env.MORALIS_API_KEY,
  }
}

module.exports = nextConfig
