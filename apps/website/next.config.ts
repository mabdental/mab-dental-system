import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mab/shared', '@mab/server'],
  allowedDevOrigins: ['127.0.0.1'],
  images: { unoptimized: true },
}

export default nextConfig
