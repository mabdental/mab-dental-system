import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mab/shared', '@mab/server'],
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
