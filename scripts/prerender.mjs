// Runs after both the client and server builds. For every route in
// scripts/routes.mjs, it calls the SSR entry to get real HTML for that page,
// stamps in the correct <title>/<meta>/<link canonical> tags, and writes a
// standalone index.html file at the right path in dist/client — so Netlify
// serves finished pages, not an empty SPA shell.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getRoutes, getNotFoundRoute } from './routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.resolve(__dirname, '../dist/client')
const serverEntry = path.resolve(__dirname, '../dist/server/entry-server.js')
const SITE_URL = 'https://indiaindata.online'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function injectMeta(html, route) {
  const fullTitle = route.title ? `${route.title} — India in Data` : 'India in Data'
  const description = route.description || ''
  const canonical = `${SITE_URL}${route.path === '/' ? '' : route.path}`

  return html
    .replace(/<title id="seo-title">.*?<\/title>/, `<title id="seo-title">${escapeHtml(fullTitle)}</title>`)
    .replace(
      /(<meta id="seo-description"[^>]*content=")[^"]*(")/,
      `$1${escapeHtml(description)}$2`
    )
    .replace(
      /(<meta id="seo-og-title"[^>]*content=")[^"]*(")/,
      `$1${escapeHtml(fullTitle)}$2`
    )
    .replace(
      /(<meta id="seo-og-description"[^>]*content=")[^"]*(")/,
      `$1${escapeHtml(description)}$2`
    )
    .replace(/(<link id="seo-canonical"[^>]*href=")[^"]*(")/, `$1${canonical}$2`)
}

async function main() {
  if (!fs.existsSync(serverEntry)) {
    console.error('Missing SSR bundle at', serverEntry, '— did the server build run first?')
    process.exit(1)
  }
  const template = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf-8')
  const { render } = await import(serverEntry)

  const routes = [...getRoutes(), getNotFoundRoute()]
  let ok = 0

  for (const route of routes) {
    let appHtml
    try {
      appHtml = render(route.path)
    } catch (err) {
      console.error(`Failed to prerender ${route.path}:`, err.message)
      continue
    }

    let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    html = injectMeta(html, route)

    let outPath
    if (route.path === '/') {
      outPath = path.join(clientDir, 'index.html')
    } else if (route.path === '/404') {
      outPath = path.join(clientDir, '404.html')
    } else {
      const dir = path.join(clientDir, route.path)
      fs.mkdirSync(dir, { recursive: true })
      outPath = path.join(dir, 'index.html')
    }
    fs.writeFileSync(outPath, html)
    ok += 1
  }

  console.log(`Prerendered ${ok}/${routes.length} routes into dist/client`)

  // The SSR bundle was only a build-time tool — no need to ship it.
  fs.rmSync(path.resolve(__dirname, '../dist/server'), { recursive: true, force: true })
}

main()
