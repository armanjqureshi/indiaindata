// ---------------------------------------------------------------------------
// India in Data — content layer
//
// Actual editorial content (articles, authors, page copy, site settings) now
// lives as JSON files under /content, edited either by hand or through the
// Decap CMS admin screen at /admin. This file's job is just to load those
// files at build time (via Vite's import.meta.glob) and assemble them into
// the same shapes the rest of the app already expects — so no page or
// component needs to change when content changes.
//
// Structural metadata that isn't really "content" (which color a section
// uses, which slugs exist) stays here in code, since changing it is a design
// decision, not a copy edit.
// ---------------------------------------------------------------------------

const SECTION_META = [
  { slug: 'news', name: 'News', color: 'news', hex: '#4A6FA5' },
  { slug: 'business', name: 'Business', color: 'business', hex: '#4F46B8' },
  { slug: 'market', name: 'Market', color: 'market', hex: '#1E7F4F' },
  { slug: 'blogs', name: 'Blogs', color: 'blogs', hex: '#0E6E6E' },
]

const TOPIC_META = [
  { slug: 'economy', name: 'Economy', color: 'economy', hex: '#B45309' },
  { slug: 'society', name: 'Society', color: 'society', hex: '#7E3FA8' },
  { slug: 'policy', name: 'Policy', color: 'news', hex: '#4A6FA5' },
  { slug: 'data-methods', name: 'Data methods', color: 'blogs', hex: '#0E6E6E' },
  { slug: 'markets', name: 'Markets', color: 'market', hex: '#1E7F4F' },
]

const INDICATOR_CATEGORY_META = [
  { slug: 'prices', name: 'Prices & Inflation', color: 'economy' },
  { slug: 'growth', name: 'Growth & Output', color: 'business' },
  { slug: 'employment', name: 'Employment & Labour', color: 'society' },
  { slug: 'monetary', name: 'Monetary Policy & Rates', color: 'news' },
  { slug: 'external', name: 'External Sector', color: 'market' },
  { slug: 'public-finance', name: 'Public Finance', color: 'economy' },
  { slug: 'markets', name: 'Markets', color: 'market' },
  { slug: 'real-time', name: 'Real-Time Proxies', color: 'blogs' },
]

const IPO_STATUS_META = [
  { slug: 'open', name: 'Open for subscription', color: 'market' },
  { slug: 'upcoming', name: 'Upcoming', color: 'news' },
  { slug: 'closed', name: 'Closed — awaiting listing', color: 'economy' },
  { slug: 'listed', name: 'Recently listed', color: 'blogs' },
]

// --- load CMS-editable JSON at build time -----------------------------------
const articleFiles = import.meta.glob('/content/articles/*.json', { eager: true })
const indicatorFiles = import.meta.glob('/content/indicators/*.json', { eager: true })
const ipoFiles = import.meta.glob('/content/ipos/*.json', { eager: true })
const authorsFile = import.meta.glob('/content/authors.json', { eager: true })
const siteSettingsFile = import.meta.glob('/content/settings/site.json', { eager: true })
const homePageFile = import.meta.glob('/content/pages/home.json', { eager: true })
const aboutPageFile = import.meta.glob('/content/pages/about.json', { eager: true })
const contactPageFile = import.meta.glob('/content/pages/contact.json', { eager: true })

const siteSettings = Object.values(siteSettingsFile)[0]?.default || {}
const authorsData = Object.values(authorsFile)[0]?.default || { team: [] }

export const homeCopy = Object.values(homePageFile)[0]?.default || {}
export const aboutCopy = Object.values(aboutPageFile)[0]?.default || {}
export const contactCopy = Object.values(contactPageFile)[0]?.default || {}

// Each chart's `data` is stored as a JSON string in its file (Decap's chart
// editor uses a text field for it, since different charts have different
// column names and can't be modeled as fixed form fields) — parse it back
// into a real array here.
function normalizeChart(chart) {
  let data = chart.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      data = []
    }
  }
  return { ...chart, data }
}

export const articles = Object.values(articleFiles)
  .map((m) => m.default)
  .filter(Boolean)
  .map((a) => ({ ...a, charts: (a.charts || []).map(normalizeChart) }))

export const indicators = Object.values(indicatorFiles)
  .map((m) => m.default)
  .filter(Boolean)
  .map((ind) => ({ ...ind, chart: normalizeChart(ind.chart) }))
  .sort((a, b) => a.name.localeCompare(b.name))

export const indicatorCategories = INDICATOR_CATEGORY_META

export const ipos = Object.values(ipoFiles)
  .map((m) => m.default)
  .filter(Boolean)
  .map((ipo) => ({ ...ipo, chart: ipo.chart ? normalizeChart(ipo.chart) : null }))
  .sort((a, b) => {
    // Most time-relevant first: open > upcoming > closed > listed, then by date
    const order = { open: 0, upcoming: 1, closed: 2, listed: 3 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    const aDate = a.listingDate || a.openDate || ''
    const bDate = b.listingDate || b.openDate || ''
    return bDate.localeCompare(aDate)
  })

export const ipoStatuses = IPO_STATUS_META

export const sections = SECTION_META.map((s) => ({
  ...s,
  description: siteSettings.sectionDescriptions?.[s.slug] || '',
}))

export const topics = TOPIC_META.map((t) => ({
  ...t,
  description: siteSettings.topicDescriptions?.[t.slug] || '',
}))

// About.jsx does `Object.values(authors)` for its team grid — that works
// whether `authors` is an object or (as here) already an array, so no
// changes are needed there.
export const authors = authorsData.team || []

export const marketTickers = siteSettings.marketTickers || []
export const siteStats = siteSettings.siteStats || []

// ---------------------------------------------------------------------------
// Helpers (unchanged from the original data model)
// ---------------------------------------------------------------------------
export const getSection = (slug) => sections.find((s) => s.slug === slug)
export const getTopic = (slug) => topics.find((t) => t.slug === slug)
export const getArticle = (slug) => articles.find((a) => a.slug === slug)
export const getBySection = (slug) =>
  articles.filter((a) => a.section === slug).sort((a, b) => b.date.localeCompare(a.date))
export const getByTopic = (slug) =>
  articles.filter((a) => a.topics.includes(slug)).sort((a, b) => b.date.localeCompare(a.date))
export const getLatest = (n = 9) =>
  [...articles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n)
export const getFeatured = () => articles.filter((a) => a.featured)
export const getRelated = (article, n = 3) =>
  getBySection(article.section).filter((a) => a.id !== article.id).slice(0, n)

export const getIndicatorCategory = (slug) => indicatorCategories.find((c) => c.slug === slug)
export const getIndicator = (slug) => indicators.find((i) => i.slug === slug)
export const getIndicatorsByCategory = (slug) => indicators.filter((i) => i.category === slug)

// Articles related to an indicator are found by shared topic tags — no
// manual list to keep in sync, so a new article about "economy" automatically
// starts showing up on every economy-tagged indicator's page.
export const getArticlesForIndicator = (indicator, n = 4) =>
  articles
    .filter((a) => a.topics.some((t) => indicator.topics.includes(t)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)

export const getIpoStatus = (slug) => ipoStatuses.find((s) => s.slug === slug)
export const getIpo = (slug) => ipos.find((i) => i.slug === slug)
export const getIposByStatus = (slug) => ipos.filter((i) => i.status === slug)
export const getArticlesForIpo = (ipo, n = 4) =>
  articles
    .filter((a) => a.topics.some((t) => ipo.topics.includes(t)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)

export const formatDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export const sectionColorMap = {
  news: { text: 'text-news', bg: 'bg-news', bgLight: 'bg-news-light', border: 'border-news', hex: '#4A6FA5' },
  business: { text: 'text-business', bg: 'bg-business', bgLight: 'bg-business-light', border: 'border-business', hex: '#4F46B8' },
  market: { text: 'text-market', bg: 'bg-market', bgLight: 'bg-market-light', border: 'border-market', hex: '#1E7F4F' },
  blogs: { text: 'text-blogs', bg: 'bg-blogs', bgLight: 'bg-blogs-light', border: 'border-blogs', hex: '#0E6E6E' },
  economy: { text: 'text-economy', bg: 'bg-economy', bgLight: 'bg-economy-light', border: 'border-economy', hex: '#B45309' },
  society: { text: 'text-society', bg: 'bg-society', bgLight: 'bg-society-light', border: 'border-society', hex: '#7E3FA8' },
  policy: { text: 'text-news', bg: 'bg-news', bgLight: 'bg-news-light', border: 'border-news', hex: '#4A6FA5' },
  'data-methods': { text: 'text-blogs', bg: 'bg-blogs', bgLight: 'bg-blogs-light', border: 'border-blogs', hex: '#0E6E6E' },
  markets: { text: 'text-market', bg: 'bg-market', bgLight: 'bg-market-light', border: 'border-market', hex: '#1E7F4F' },
}
