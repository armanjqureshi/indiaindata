import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getRoutes } from './routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.resolve(__dirname, '../dist/client')
const SITE_URL = 'https://indiaindata.online'

function urlEntry(route) {
  const loc = `${SITE_URL}${route.path === '/' ? '/' : route.path.replace(/\/?$/, '/')}`
  const lastmod = route.lastmod ? `\n    <lastmod>${route.lastmod}</lastmod>` : ''
  return `  <url>
    <loc>${loc}</loc>${lastmod}
    <changefreq>${route.changefreq || 'monthly'}</changefreq>
    <priority>${route.priority ?? 0.5}</priority>
  </url>`
}

function main() {
  const routes = getRoutes().filter((r) => !r.noSitemap)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(urlEntry).join('\n')}
</urlset>
`
  fs.writeFileSync(path.join(clientDir, 'sitemap.xml'), xml)
  console.log(`sitemap.xml written with ${routes.length} URLs`)

  // Temporary: pages switched to noindex on 2026-11-26, listed with that date so Google recrawls them
  // soon and sees the noindex. Listed in robots.txt. Delete this block and the robots.txt line once
  // Search Console shows them as "Excluded by noindex" (a few weeks).
  const dropped = getRoutes().filter((r) => r.noindex)
  const removed = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${dropped.map((r) => urlEntry({ ...r, lastmod: '2026-11-26' })).join('\n')}
</urlset>
`
  fs.writeFileSync(path.join(clientDir, 'sitemap-noindex.xml'), removed)
  console.log(`sitemap-noindex.xml written with ${dropped.length} URLs`)
}

main()
