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
import { MANDI_COMMODITIES, MANDI_HUB, mandiPath, stateLabel } from '../src/data/mandi.js'

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
    slug: 'upi-record-october-2026',
    title: 'UPI handled 25.47 billion payments in October, a record',
    dek: 'It was the first month above 25 billion payments and ₹30 lakh crore. Payments grew 23% on a year earlier, value 16%, so the average payment shrank.',
    source: 'NPCI UPI monthly statistics, as reported by Inc42 (October 2026) and compiled by India Dispatch Research (October 2025 to September 2026)',
    ogImage: '/infographics/upi-record-october-2026-og.png',
    date: '2026-11-02',
  },
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
      title: a.seoTitle || a.title,
      description: a.seoDescription || a.dek,
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

  // Kitchen-staple price pages (keep in sync with src/data/prices.js)
  for (const [path, title, item] of [
    ['/tomato-price-today', 'Tomato price today in India', 'tomato'],
    ['/onion-price-today', 'Onion price today in India', 'onion'],
    ['/potato-price-today', 'Potato price today in India', 'potato'],
    ['/tur-dal-price', 'Tur dal price today in India', 'tur dal'],
    ['/atta-price', 'Atta price today in India', 'atta'],
    ['/rice-price-today', 'Rice price today in India', 'rice'],
    ['/sugar-price-today', 'Sugar price today in India', 'sugar'],
    ['/milk-price-today', 'Milk price today in India', 'milk'],
  ]) {
    routes.push({ path, title, description: `All-India average retail and wholesale price of ${item} today, updated daily from the Department of Consumer Affairs, with the change over time and other staples.`, changefreq: 'daily', priority: 0.8 })
  }
  routes.push({ path: '/edible-oil-price-today', title: 'Edible oil price today in India', description: 'All-India average retail and wholesale prices of mustard, groundnut, sunflower, soya and palm oil and vanaspati today, updated daily from the Department of Consumer Affairs.', changefreq: 'daily', priority: 0.8 })
  routes.push({ path: '/food-prices-today', title: 'Food prices today in India: vegetables, dal, atta, oil and milk', description: 'All-India average retail and wholesale prices of 23 kitchen staples today: tomato, onion, potato, rice, atta, dals, edible oils, sugar and milk. Updated daily from the Department of Consumer Affairs.', changefreq: 'daily', priority: 0.8 })

  // City home prices (NHB RESIDEX), from live/property-cities.json
  {
    const f = path.join(contentDir, '..', 'live', 'property-cities.json')
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf-8'))
      routes.push({ path: '/property-prices', title: 'Property prices in India: price per sq ft in 50 cities (NHB RESIDEX)', description: 'Average home price per square foot of carpet area in 50 Indian cities, from metros to tier 2 and tier 3 cities, with the change over the quarter and the year. Official figures from the National Housing Bank.', changefreq: 'weekly', priority: 0.8 })
      for (const c of d.cities) {
        routes.push({ path: `/property-prices/${c.slug}`, title: `${c.name} property prices: price per sq ft and trend (NHB)`, description: `Average home price per square foot of carpet area in ${c.name}, by home size, with the change over the quarter and the year, and the long-run trend. Official figures from the National Housing Bank's RESIDEX.`, changefreq: 'weekly', priority: c.tier === 1 ? 0.7 : 0.6 })
      }
    }
  }

  // City air quality pages, from the files written by scripts/data/update-aqi.mjs
  {
    const latest = path.join(contentDir, '..', 'live', 'aqi.json')
    const dir = path.join(contentDir, '..', 'live', 'aqi')
    if (fs.existsSync(latest) && fs.existsSync(dir)) {
      routes.push({ path: '/aqi', title: 'AQI today: air quality index of every Indian city (CPCB)', description: "Today's air quality index for about 280 Indian cities from CPCB's daily bulletin: the metros, million-plus cities and smaller towns, with the main pollutant, the change since yesterday and a year ago.", changefreq: 'daily', priority: 0.9 })
      for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
        // only cities with a reading in the last 120 days get a page
        const last = c.history?.[c.history.length - 1]?.[0]
        if (!last || Date.now() - Date.parse(last) > 120 * 864e5) continue
        routes.push({ path: `/aqi/${c.slug}`, title: `${c.name} AQI today: air quality index and pollution level`, description: `${c.name}'s air quality index (AQI) today from CPCB's daily bulletin, with the main pollutant, the change since yesterday and a year ago, and every day's AQI over the past year.`, changefreq: 'daily', priority: c.tier === 1 ? 0.8 : c.tier === 2 ? 0.7 : 0.6 })
      }
    }
  }

  // District pages (Census 2011), from the files written by scripts/data/build-districts.py
  {
    const dir = path.join(contentDir, '..', 'live', 'districts')
    const idxFile = path.join(contentDir, '..', 'live', 'districts-index.json')
    if (fs.existsSync(idxFile)) {
      const idx = JSON.parse(fs.readFileSync(idxFile, 'utf-8'))
      routes.push({ path: '/districts', title: `Districts of India: population, literacy and sex ratio of all ${idx.districts.length} districts (Census 2011)`, description: 'Every district of India in the 2011 Census, with population, literacy rate, sex ratio and urban share, rankings, and a page for each district and state.', changefreq: 'monthly', priority: 0.8 })
      for (const st of idx.states) {
        routes.push({ path: `/districts/${st.slug}`, title: st.districts === 1 ? `Districts of ${st.name}: population, literacy and sex ratio (Census 2011)` : `Districts of ${st.name}: population, literacy and sex ratio of all ${st.districts} districts (Census 2011)`, description: `${st.districts === 1 ? 'The district' : `All ${st.districts} districts`} of ${st.name} in the 2011 Census, ranked by population, literacy rate, sex ratio and urban share, with a page for each district.`, changefreq: 'monthly', priority: 0.7 })
        const f = JSON.parse(fs.readFileSync(path.join(dir, `${st.slug}.json`), 'utf-8'))
        for (const d of f.districts) {
          const label = d.censusName ? `${d.name} (${d.censusName})` : d.name
          routes.push({ path: `/districts/${st.slug}/${d.slug}`, title: `${label} district population, literacy rate and sex ratio (Census 2011)`, description: `${d.name} district, ${st.name}: population ${d.pop.toLocaleString('en-IN')}, literacy ${d.literacy.toFixed(1)}%, sex ratio ${d.sexRatio}, urban share ${d.urbanPct.toFixed(1)}% in the 2011 Census, with its rank among India's ${idx.districts.length} districts.`, changefreq: 'yearly', priority: 0.6 })
        }
      }
    }
  }

  // Mandi (wholesale market) price pages, from the commodity files written by the India-runner job
  routes.push({ path: MANDI_HUB.path, title: 'Mandi prices today in India: onion, tomato, potato, wheat and more', description: 'Wholesale mandi prices today for onion, tomato, potato, garlic, ginger, vegetables, wheat and pulses, by state, in rupees a quintal. Daily data from Agmarknet.', changefreq: 'daily', priority: 0.8 })
  for (const c of MANDI_COMMODITIES) {
    const f = path.join(contentDir, '..', 'live', 'mandi', `${c.slug}.json`)
    if (!fs.existsSync(f)) continue
    routes.push({ path: mandiPath(c), title: `${c.name} mandi price today in India`, description: `Wholesale ${c.lower} price today at mandis across India: the all-India median and the state-wise prices in rupees a quintal, with the change over time. Source: Agmarknet.`, changefreq: 'daily', priority: 0.7 })
    const states = JSON.parse(fs.readFileSync(f, 'utf-8')).latest?.states || {}
    for (const [st, v] of Object.entries(states)) {
      if (v.markets < 3) continue
      routes.push({ path: mandiPath(c, st), title: `${c.name} price in ${stateLabel(st)} today: mandi rates`, description: `Wholesale ${c.lower} price in ${stateLabel(st)} today: the state median, rates at individual mandis in rupees a quintal, and how it compares with the all-India price. Source: Agmarknet.`, changefreq: 'daily', priority: 0.6 })
    }
  }

  for (const [path, title, description] of [
    ['/states', 'Indian states ranked: GDP, per capita income and richest state', 'Rankings of Indian states by GSDP, per capita income and wealth, from the RBI Handbook of Statistics on Indian States.'],
    ['/state-wise-gdp-of-india', 'State-wise GDP of India (2024-25), ranked', 'Maharashtra leads at ₹45.3 lakh crore, then Tamil Nadu and Uttar Pradesh. GSDP of every state and UT, 2011-12 to 2024-25, from the RBI Handbook.'],
    ['/per-capita-income-by-state', 'Per capita income by state in India (2024-25)', 'Income per person for every state and UT, 2011-12 to 2024-25. Delhi leads 2024-25 at ₹4.93 lakh; Sikkim and Goa led 2023-24. RBI data.'],
    ['/poorest-state-in-india', 'Poorest state in India: by income and by multidimensional poverty', 'Which is the poorest state in India? Bihar is lowest on income per person and on NITI Aayog’s multidimensional poverty index. Ranked tables with sources.'],
    ['/population-by-state', 'India population by state (2026 projection)', 'Uttar Pradesh has 24.3 crore people in 2026, then Bihar (13.2 crore) and Maharashtra (12.9 crore). All states and UTs ranked, 2011 to 2036.'],
    ['/richest-state-in-india', 'Richest state in India: top 10 (2024-25)', 'Maharashtra has the biggest economy; Delhi tops income per person in 2024-25, after Sikkim and Goa in 2023-24. Top 10 lists from RBI data.'],
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

