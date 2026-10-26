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
  flows: 'Capital Flows',
  'currency-commodities': 'Currencies & Commodities',
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
    .filter((a) => !a.draft)
}

function readIndicators() {
  const dir = path.join(contentDir, 'indicators')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
}

// IPO pages come from the scheduled NSE data job (live/ipos.json). Older
// issues in live/ipos-archive.json are served by the client-side fallback
// (see public/_redirects) instead of being prerendered one by one.
function readIpos() {
  const f = path.join(contentDir, '..', 'live', 'ipos.json')
  if (!fs.existsSync(f)) return []
  return JSON.parse(fs.readFileSync(f, 'utf-8')).ipos || []
}

// Infographics (keep in sync with src/infographics/registry.js)
const INFOGRAPHICS_META = [
  {
    slug: 'fpi-selloff-october-2026',
    title: 'Foreign investors pulled ₹48,056 crore out of Indian shares in 15 days',
    dek: '92% of the selling came in the first six sessions of the month. Since 12 October the net flow has been small.',
    source: 'NSDL trends in FPI investment (equity, all routes); NSE provisional FII/DII data',
    ogImage: '/infographics/fpi-selloff-october-2026-og.png',
    date: '2026-10-25',
  },
]

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
    title: 'IPO tracker: mainboard and SME IPOs',
    description:
      'Every mainboard and SME IPO on NSE: live subscription by category, price bands, lot sizes, timetables, listing gains and returns since listing.',
    changefreq: 'daily',
    priority: 0.9,
  })

  for (const ipo of ipoList) {
    const name = (ipo.name || '').replace(/\s+Limited$/i, '')
    routes.push({
      path: `/ipos/${ipo.slug}`,
      title: `${name} IPO: dates, price band, subscription, listing`,
      description: `${name} IPO on NSE ${ipo.board === 'sme' ? 'SME' : 'mainboard'}: bidding ${ipo.open} to ${ipo.close}. Price band, lot size, subscription by category, timetable and listing performance.`,
      changefreq: ipo.status === 'listed' ? 'monthly' : 'daily',
      priority: ipo.status === 'listed' ? 0.5 : 0.7,
      lastmod: ipo.listingDate || ipo.close || ipo.open,
    })
  }

  // One GMP page per current mainboard issue (open, upcoming, awaiting listing, and
  // the two weeks after listing), so people searching "<company> IPO GMP" land on it.
  const gmpCutoff = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  for (const ipo of ipoList) {
    if (ipo.board !== 'mainboard') continue
    const current = ['open', 'upcoming', 'closed'].includes(ipo.status) || (ipo.status === 'listed' && ipo.listingDate >= gmpCutoff)
    if (!current) continue
    const name = (ipo.name || '').replace(/\s+Limited$/i, '')
    routes.push({
      path: `/ipo-gmp/${ipo.slug}`,
      title: `${name} IPO GMP today: grey market premium and listing price`,
      description: `${name} IPO GMP today: reported grey market premium with its source and date, implied listing price, price band, lot size, subscription status and listing date. Unofficial figure, not a forecast.`,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: ipo.close || ipo.open,
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
    path: '/infographics',
    title: 'Infographics: India in data, one picture at a time',
    description: 'Designed, shareable infographics on India’s markets, economy and society, built from official data. Download the image or embed it with credit.',
    changefreq: 'weekly',
    priority: 0.7,
  })
  for (const g of INFOGRAPHICS_META) {
    routes.push({
      path: `/infographics/${g.slug}`,
      title: g.title,
      description: `${g.dek} Source: ${g.source}.`,
      image: g.ogImage,
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: g.date,
    })
  }

  routes.push({
    path: '/ipo-gmp',
    title: 'IPO GMP today: grey market premium for upcoming IPOs',
    description: 'Reported grey market premium (GMP) for open, upcoming and unlisted IPOs, with the source and time of each figure, and a record of how GMP compared with actual listing gains.',
    changefreq: 'daily',
    priority: 0.8,
  })

  for (const [path, title, description] of [
    ['/states', 'Indian states ranked: GDP, per capita income and richest state', 'Rankings of Indian states by GSDP, per capita income and wealth, from the RBI Handbook of Statistics on Indian States.'],
    ['/state-wise-gdp-of-india', 'State-wise GDP of India: GSDP of all states (2024-25)', 'GSDP of every Indian state and UT from the RBI Handbook, in rupees lakh crore, with real growth. Maharashtra is largest. Choose any year from 2011-12 to 2024-25.'],
    ['/per-capita-income-by-state', 'Per capita income by state in India (2024-25)', 'Per capita net state domestic product for every Indian state and UT, 2011-12 to 2024-25, from the RBI Handbook. See which states are richest and poorest per person.'],
    ['/poorest-state-in-india', 'Poorest state in India: by income and by multidimensional poverty', 'Which is the poorest state in India? Bihar is lowest on income per person and on NITI Aayog’s multidimensional poverty index. Ranked tables with sources.'],
    ['/population-by-state', 'India population by state (2026 projection)', 'Projected population of every Indian state and UT from 2011 to 2036, from the National Commission on Population. Uttar Pradesh is largest. Ranked, with share of India.'],
    ['/richest-state-in-india', 'Richest state in India: by GDP and by income per person', 'Which is the richest state in India? Maharashtra is largest by GDP; Goa, Sikkim and Delhi lead on per capita income. Ranked tables from the RBI Handbook.'],
  ]) {
    routes.push({ path, title, description, changefreq: 'monthly', priority: path === '/states' ? 0.6 : 0.8 })
  }

  routes.push({
    path: '/ipo-dashboard',
    title: 'IPO dashboard: open, upcoming and listing IPOs with GMP and subscription',
    description: 'One page for every IPO on NSE: what is open now, what opens next, what lists soon, with subscription, grey market premium, a 14-day calendar and how IPOs have listed this year.',
    changefreq: 'daily',
    priority: 0.9,
  })

  routes.push({
    path: '/sme-ipo-gmp',
    title: 'SME IPO GMP today: NSE Emerge grey market premium and listing gains',
    description: 'SME IPO GMP for NSE Emerge issues, plus what the listing data shows: how many SME IPOs list below issue price, and how subscription relates to listing gain. Sourced from NSE.',
    changefreq: 'daily',
    priority: 0.8,
  })

  routes.push({
    path: '/ipo-subscription-status',
    title: 'IPO subscription status today',
    description: 'Subscription status of IPOs open now on NSE, upcoming issues and recently closed IPOs, with the consolidated NSE and BSE subscription multiple. Updated through the bidding day.',
    changefreq: 'daily',
    priority: 0.8,
  })

  for (const [slug, title, description, priority] of [
    ['methodology', 'Methodology', 'Where every figure on India in Data comes from, how often it updates, and the checks we run before publishing.', 0.5],
    ['corrections', 'Corrections', 'How India in Data handles errors, and a log of corrections.', 0.4],
    ['privacy', 'Privacy policy', 'What information India in Data collects and who else receives it.', 0.2],
    ['terms', 'Terms of use', 'The terms for using India in Data, including how you may reuse our charts and data.', 0.2],
    ['disclaimer', 'Disclaimer', 'India in Data does not give investment advice. Read this before you use our market and IPO information.', 0.3],
  ]) {
    routes.push({ path: `/${slug}`, title, description, changefreq: 'monthly', priority })
  }

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

