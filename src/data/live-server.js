// Build-time only: loads /live into the snapshot store used while
// prerendering. Imported by entry-server.jsx, never by the browser bundle.
import { __setServerSource } from './live.js'

const first = (g, d) => Object.values(g)[0]?.default || d
const market = first(import.meta.glob('/live/market.json', { eager: true }), { items: {}, history: {} })
const ipos = first(import.meta.glob('/live/ipos.json', { eager: true }), { ipos: [] })
const archive = first(import.meta.glob('/live/ipos-archive.json', { eager: true }), { ipos: [] })
const details = Object.fromEntries(
  Object.entries(import.meta.glob('/live/ipo/*.json', { eager: true })).map(([p, m]) => [p.split('/').pop().replace('.json', ''), m.default])
)

__setServerSource({
  // pages only need recent history for charts; keep embedded data small
  market: { ...market, history: Object.fromEntries(Object.entries(market.history || {}).map(([k, v]) => [k, v.slice(-120)])) },
  ipos,
  details,
  rowsBySlug: Object.fromEntries([...archive.ipos, ...ipos.ipos].map((r) => [r.slug, r])),
  meta: { iposTotal: ipos.ipos.length + archive.ipos.length, iposUpdatedAt: ipos.updatedAt || null },
})
