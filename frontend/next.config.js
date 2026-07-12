/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  staticPageGenerationTimeout: 180,
  images: {
    domains: ['api.fireworks.ai', 'storage.googleapis.com'],
  },
}

module.exports = nextConfig