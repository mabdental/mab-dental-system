import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mab/shared', '@mab/server'],
}

export default nextConfig
