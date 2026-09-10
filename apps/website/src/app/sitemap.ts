import type { MetadataRoute } from 'next'
import { BRANCHES, SERVICES } from '@mab/shared'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'http://localhost:3000'
  const staticRoutes = ['', '/services', '/locations', '/our-clinic', '/reviews', '/contact', '/book', '/privacy', '/terms']
  return [...staticRoutes.map((route) => ({ url: base + route, lastModified: new Date() })), ...SERVICES.map((service) => ({ url: base + '/services/' + service.slug, lastModified: new Date() })), ...BRANCHES.map((branch) => ({ url: base + '/locations/' + branch.slug, lastModified: new Date() }))]
}
