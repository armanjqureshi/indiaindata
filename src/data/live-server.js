// Build-time only: loads /live into the snapshot store used while
// prerendering. Imported by entry-server.jsx, never by the browser bundle.
import { __setServerSource } from './live.js'
import { stateSlug } from './mandi.js'

const first = (g, d) => Object.values(g)[0]?.default || d
const market = first(import.meta.glob('/live/market.json', { eager: true }), { items: {}, history: {} })
const ipos = first(import.meta.glob('/live/ipos.json', { eager: true }), { ipos: [] })
const gmp = first(import.meta.glob('/live/gmp.json', { eager: true }), { entries: [] })
const prices = first(import.meta.glob('/live/prices.json', { eager: true }), { history: {} })
const mandiFiles = Object.fromEntries(
  Object.entries(import.meta.glob('/live/mandi/*.json', { eager: true })).map(([p, m]) => [p.split('/').pop().replace('.json', ''), m.default])
)
const mandiIndex = first(import.meta.glob('/live/mandi-index.json', { eager: true }), { items: {} })
// Trimmed copy for one page: recent history only, market lists only for the page's own state.
function mandiFor(slug, st) {
  const d = mandiFiles[slug]
  if (!d?.latest) return null
  const keep = st ? Object.keys(d.latest.states).filter((s) => stateSlug(s) === st) : []
  const states = Object.fromEntries(Object.entries(d.latest.states).map(([s, v]) => [s, keep.includes(s) ? v : { median: v.median, min: v.min, max: v.max, markets: v.markets }]))
  const hs = Object.fromEntries(Object.entries(d.history.states || {}).filter(([s]) => keep.includes(s)).map(([s, h]) => [s, h.slice(-120)]))
  return { ...d, latest: { ...d.latest, states }, history: { india: d.history.india.slice(-400), states: hs } }
}
const districtFiles = Object.fromEntries(
  Object.entries(import.meta.glob('/live/districts/*.json', { eager: true })).map(([p, m]) => [p.split('/').pop().replace('.json', ''), m.default])
)
const districtIndex = first(import.meta.glob('/live/districts-index.json', { eager: true }), null)
// Trimmed copy for one page: the page's own district in full, the others as table rows.
const DISTRICT_ROW = ['name', 'slug', 'censusName', 'pop', 'literacy', 'sexRatio', 'childSexRatio', 'urbanPct', 'scPct', 'stPct', 'workPct']
function districtsFor(state, district) {
  const d = districtFiles[state]
  if (!d) return null
  const slim = (x) => Object.fromEntries(DISTRICT_ROW.filter((k) => k in x).map((k) => [k, x[k]]))
  return { ...d, districts: d.districts.map((x) => (district && x.slug === district ? x : slim(x))) }
}
const aqiLatest = first(import.meta.glob('/live/aqi.json', { eager: true }), null)
const aqiFiles = Object.fromEntries(
  Object.entries(import.meta.glob('/live/aqi/*.json', { eager: true })).map(([p, m]) => [p.split('/').pop().replace('.json', ''), m.default])
)
const archive = first(import.meta.glob('/live/ipos-archive.json', { eager: true }), { ipos: [] })
const details = Object.fromEntries(
  Object.entries(import.meta.glob('/live/ipo/*.json', { eager: true })).map(([p, m]) => [p.split('/').pop().replace('.json', ''), m.default])
)

__setServerSource({
  // pages only need recent history for charts; keep embedded data small
  market: { ...market, history: Object.fromEntries(Object.entries(market.history || {}).map(([k, v]) => [k, v.slice(-120)])) },
  ipos,
  gmp,
  prices: { ...prices, history: Object.fromEntries(Object.entries(prices.history || {}).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([n, h]) => [n, h.slice(-400)]))])) },
  details,
  mandi: mandiFor,
  districts: districtsFor,
  districtIndex,
  aqi: aqiLatest,
  aqiCity: (slug) => aqiFiles[slug] || null,
  aqiSummary: (slug) => {
    if (!aqiLatest) return null
    const me = aqiLatest.cities.find((c) => c.slug === slug)
    const state = me?.state || aqiFiles[slug]?.state
    const keep = aqiLatest.cities.filter((c) => c.slug === slug || c.tier === 1 || (state && c.state === state))
    return { ...aqiLatest, total: aqiLatest.cities.length, cities: keep, absent: [] }
  },
  mandiIndex,
  rowsBySlug: Object.fromEntries([...archive.ipos, ...ipos.ipos].map((r) => [r.slug, r])),
  meta: { iposTotal: ipos.ipos.length + archive.ipos.length, iposUpdatedAt: ipos.updatedAt || null },
})
