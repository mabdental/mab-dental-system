import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mab/shared', '@mab/server'],
  images: { unoptimized: true },
}

export default nextConfig
