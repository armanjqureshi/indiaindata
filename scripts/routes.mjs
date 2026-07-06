// Single source of truth for "which URLs exist on this site" — used by both
// the prerender script and the sitemap generator.
//
// This reads straight from the /content JSON files with plain Node fs calls
// rather than importing src/data/content.js, because that file uses Vite's
// import.meta.glob() to load content — a build-time feature that only Vite's
// own transform pipeline understands. Plain Node (which is what runs these
// build scripts) can't parse import.meta.glob, so this file deliberately
// stays independent of it and reads the same source files itself.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.resolve(__dirname, '../content')

const SECTION_SLUGS = ['news', 'business', 'market', 'blogs']
const TOPIC_NAMES = {
  economy: 'Economy',
  society: 'Society',
  policy: 'Policy',
  'data-methods': 'Data methods',
  markets: 'Markets',
}
const INDICATOR_CATEGORY_NAMES = {
  prices: 'Prices & Inflation',
  growth: 'Growth & Output',
  employment: 'Employment & Labour',
  monetary: 'Monetary Policy & Rates',
  external: 'External Sector',
  'public-finance': 'Public Finance',
  markets: 'Markets',
  'real-time': 'Real-Time Proxies',
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, relPath), 'utf-8'))
}

function readArticles() {
  const dir = path.join(contentDir, 'articles')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
}

function readIndicators() {
  const dir = path.join(contentDir, 'indicators')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
}

function readIpos() {
  const dir = path.join(contentDir, 'ipos')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
}

export function getRoutes() {
  const settings = readJson('settings/site.json')
  const articles = readArticles()
  const routes = []

  routes.push({
    path: '/',
    title: null, // Home keeps the default site title
    description:
      "Chart-led stories on India's news, business, markets and economy. Every piece anchored by a chart.",
    changefreq: 'daily',
    priority: 1.0,
  })

  for (const slug of SECTION_SLUGS) {
    routes.push({
      path: `/${slug}`,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      description: settings.sectionDescriptions?.[slug] || '',
      changefreq: 'daily',
      priority: 0.8,
    })
  }

  for (const slug of Object.keys(TOPIC_NAMES)) {
    routes.push({
      path: `/topic/${slug}`,
      title: TOPIC_NAMES[slug],
      description: settings.topicDescriptions?.[slug] || '',
      changefreq: 'weekly',
      priority: 0.6,
    })
  }

  for (const a of articles) {
    routes.push({
      path: `/article/${a.slug}`,
      title: a.title,
      description: a.dek,
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: a.date,
    })
  }

  const indicators = readIndicators()

  routes.push({
    path: '/indicators',
    title: 'Indicators',
    description:
      "India's key economic and market indicators, tracked in one place — prices, growth, employment, monetary policy, trade, public finance, markets and real-time proxies.",
    changefreq: 'weekly',
    priority: 0.9,
  })

  for (const slug of Object.keys(INDICATOR_CATEGORY_NAMES)) {
    routes.push({
      path: `/indicators/category/${slug}`,
      title: `${INDICATOR_CATEGORY_NAMES[slug]} indicators`,
      description: `India's ${INDICATOR_CATEGORY_NAMES[slug].toLowerCase()} indicators — current values, direction, and full history.`,
      changefreq: 'weekly',
      priority: 0.5,
    })
  }

  for (const ind of indicators) {
    routes.push({
      path: `/indicators/${ind.slug}`,
      title: ind.name,
      description: ind.description,
      changefreq: 'weekly',
      priority: 0.6,
      lastmod: ind.asOf,
    })
  }

  const ipoList = readIpos()

  routes.push({
    path: '/ipos',
    title: 'IPOs',
    description:
      'Upcoming, open, and recently listed IPOs on Indian exchanges, alongside performance history for past listings.',
    changefreq: 'daily',
    priority: 0.9,
  })

  for (const ipo of ipoList) {
    routes.push({
      path: `/ipos/${ipo.slug}`,
      title: `${ipo.companyName} IPO`,
      description: ipo.description,
      changefreq: ipo.status === 'listed' ? 'monthly' : 'daily',
      priority: 0.6,
      lastmod: ipo.listingDate || ipo.closeDate || ipo.openDate,
    })
  }

  routes.push({
    path: '/about',
    title: 'About',
    description: 'India in Data is a data-driven editorial site.',
    changefreq: 'monthly',
    priority: 0.4,
  })

  routes.push({
    path: '/contact',
    title: 'Contact',
    description: 'Write to the India in Data team.',
    changefreq: 'yearly',
    priority: 0.3,
  })

  routes.push({
    path: '/search',
    title: 'Search',
    description: 'Search across every article, chart and dataset on India in Data.',
    noSitemap: true, // prerendered so direct visits work, but not worth indexing
  })

  return routes
}

// Rendered separately to 404.html — excluded from the sitemap.
export function getNotFoundRoute() {
  return {
    path: '/404',
    title: 'Page not found',
    description: "This page isn't in our dataset.",
  }
}

