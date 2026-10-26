// Live data written by the scheduled GitHub Actions jobs (scripts/data/*).
// The build embeds a snapshot so prerendered pages have real numbers; in the
// browser we fetch the latest copy from the repo so values stay current
// between Netlify deploys.
import { useEffect, useState } from 'react'

const REPO = 'armanjqureshi/indiaindata'

// Snapshots: during prerendering, scripts read the files in /live via
// live-server.js and record which ones each page used; prerender.mjs embeds
// exactly those in the page as JSON (#__LIVE__). In the browser we read that
// embedded copy, so hydration matches, then fetch the newest version.
const isServer = typeof document === 'undefined'
let serverSource = null
const used = new Map()
let injected = null
export function __setServerSource(src) {
  serverSource = src
}
export function __collectUsed() {
  const out = Object.fromEntries(used)
  used.clear()
  return out
}
function readInjected() {
  if (injected) return injected
  try {
    injected = JSON.parse(document.getElementById('__LIVE__')?.textContent || '{}')
  } catch {
    injected = {}
  }
  return injected
}
function snap(key) {
  if (isServer) {
    if (!serverSource) return null
    const [kind, arg] = key.split(':')
    const v =
      kind === 'market' ? serverSource.market
      : kind === 'ipos' ? serverSource.ipos
      : kind === 'gmp' ? serverSource.gmp
      : kind === 'meta' ? serverSource.meta
      : kind === 'ipo' ? serverSource.details[arg] ?? null
      : kind === 'row' ? serverSource.rowsBySlug[arg] ?? null
      : null
    used.set(key, v)
    return v
  }
  return readInjected()[key] ?? null
}
export const getMarketSnapshot = () => snap('market') || { items: {}, history: {} }
export const getIposSnapshot = () => snap('ipos') || { ipos: [] }
export const getMeta = () => snap('meta') || {}
export const getGmpSnapshot = () => snap('gmp') || { entries: [] }
export const getDetailSnapshot = (slug) => snap('ipo:' + slug)
export const getRowSnapshot = (slug) => snap('row:' + slug)

const sources = (p) => [
  `https://cdn.jsdelivr.net/gh/${REPO}@main/${p}`,
  `https://raw.githubusercontent.com/${REPO}/main/${p}`,
]
const stamp = (d) => d?.updatedAt || d?.fetchedAt || d?.subscription?.asOf || ''
const inflight = new Map()

// Fetch both copies and keep whichever is newer (the CDN can lag after an update).
export function fetchLive(path) {
  if (!inflight.has(path)) {
    inflight.set(
      path,
      Promise.all(
        sources(path).map((u) =>
          fetch(u, { cache: 'no-cache' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      ).then((all) => all.filter(Boolean).sort((a, b) => stamp(b).localeCompare(stamp(a)))[0] || null)
    )
  }
  return inflight.get(path)
}

export function useLiveState(path, snapshot) {
  const [state, setState] = useState({ data: snapshot, done: false })
  useEffect(() => {
    let on = true
    fetchLive(path).then((d) => {
      if (!on) return
      setState((s) => (d && stamp(d) >= stamp(s.data) ? { data: d, done: true } : { ...s, done: true }))
    })
    return () => {
      on = false
    }
  }, [path])
  return state
}
export const useLive = (path, snapshot) => useLiveState(path, snapshot).data

export const useMarket = () => useLive('live/market.json', getMarketSnapshot())
// GMP is edited by hand and changes during the day: read the GitHub raw copy
// (about 5 minutes of cache) rather than the CDN, which can lag for hours.
export function useGmp() {
  const [d, setD] = useState(getGmpSnapshot())
  useEffect(() => {
    let on = true
    fetch(`https://raw.githubusercontent.com/${REPO}/main/live/gmp.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => on && j && Array.isArray(j.entries) && setD(j))
      .catch(() => {})
    return () => { on = false }
  }, [])
  return d
}
// Latest reported GMP for an issue (entries are a log: later asOf wins, ties go to the later row)
export function gmpFor(entries, slug) {
  const all = (entries || []).map((e, i) => ({ e, i })).filter(({ e }) => e.slug === slug)
  all.sort((a, b) => (a.e.asOf || '').localeCompare(b.e.asOf || '') || a.i - b.i)
  return { latest: all.length ? all[all.length - 1].e : null, history: all.map(({ e }) => e).reverse() }
}
// --- Intraday index levels (written every few minutes to the "intraday" branch) ---
export const INTRADAY_URL = `https://raw.githubusercontent.com/${REPO}/intraday/live/intraday.json`
export function marketOpenIST(d = new Date()) {
  const t = new Date(+d + 5.5 * 3600e3)
  const day = t.getUTCDay(), m = t.getUTCHours() * 60 + t.getUTCMinutes()
  return day > 0 && day < 6 && m >= 9 * 60 + 15 && m <= 15 * 60 + 30
}
let intraCache = { key: null, p: null }
function loadIntraday() {
  const key = Math.floor(Date.now() / 60000)
  if (intraCache.key !== key) {
    intraCache = { key, p: fetch(`${INTRADAY_URL}?t=${key}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) }
  }
  return intraCache.p
}
export function useIntraday() {
  const [d, setD] = useState(null)
  useEffect(() => {
    let on = true
    const load = () => loadIntraday().then((j) => on && j?.items && setD(j))
    load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible' && marketOpenIST()) load() }, 60000)
    return () => { on = false; clearInterval(timer) }
  }, [])
  return d
}
// Intraday values replace end-of-day ones only for a session newer than the last official close.
export function withIntraday(market, intra) {
  if (!intra?.session || !intra.items || (market.session && intra.session <= market.session)) return { items: market.items || {}, live: null }
  const items = { ...(market.items || {}) }
  for (const [k, v] of Object.entries(intra.items)) items[k] = { ...(items[k] || {}), ...v, intraday: true }
  const ageMin = (Date.now() - Date.parse(intra.asOf)) / 60000
  return { items, live: { ...intra, open: marketOpenIST() && ageMin < 20, time: intra.asOf.slice(11, 16) } }
}
export const useIpos = () => useLive('live/ipos.json', getIposSnapshot())

// --- India-date helpers (IPO status rolls over at midnight IST) -------------
export function todayIST() {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
}
// India date of a timestamp (used so prerendered pages and the first client
// render agree on the date)
export const istDateOf = (iso) => (iso ? new Date(Date.parse(iso) + 5.5 * 3600e3).toISOString().slice(0, 10) : null)
export function useTodayIST(initial) {
  const [d, setD] = useState(initial)
  useEffect(() => setD(todayIST()), [])
  return d
}
export function ipoStatus(ipo, today) {
  if (!today) return ipo.status
  if (ipo.listingDate && ipo.listingDate <= today) return 'listed'
  if (ipo.status === 'unlisted') return 'unlisted'
  if (ipo.open && today < ipo.open) return 'upcoming'
  if (ipo.open && ipo.close && today >= ipo.open && today <= ipo.close) return 'open'
  if (ipo.close && today > ipo.close) return 'closed'
  return ipo.status
}

// --- formatting -----------------------------------------------------------
const inr = (v, dp = 2) =>
  v === null || v === undefined ? '' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
export const fmt = {
  inr,
  crore: (v) => (v === null || v === undefined ? '—' : `₹${inr(v, v >= 100 ? 0 : 2)} cr`),
  rupees: (v, dp = 0) => (v === null || v === undefined ? '—' : `₹${inr(v, dp)}`),
  times: (v) => (v === null || v === undefined ? '—' : `${v >= 100 ? inr(v, 0) : inr(v, 2)}x`),
  pct: (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${inr(v, 1)}%`),
  date: (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', opts) : '—',
  shortDate: (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'),
}

// How each live market series is displayed when it feeds an indicator card.
const LIVE_FORMAT = {
  index: { value: (v) => inr(v, 2), change: (it) => `${it.changePct > 0 ? '+' : ''}${inr(it.changePct, 2)}%` },
  vix: { value: (v) => inr(v, 2), change: (it) => `${it.changePct > 0 ? '+' : ''}${inr(it.changePct, 2)}%` },
  fx: { value: (v) => inr(v, 4), change: (it) => `${it.change > 0 ? '+' : ''}${inr(it.change, 4)}` },
  bullion: { value: (v) => `₹${inr(v, 0)}`, change: (it) => `${it.changePct > 0 ? '+' : ''}${inr(it.changePct, 2)}%` },
  flow: { value: (v) => `${v < 0 ? '-' : ''}₹${inr(Math.abs(v), 2)} cr`, change: (it) => (it.value >= 0 ? 'Net buyers' : 'Net sellers') },
  usd: { value: (v) => `$${inr(v, 2)}`, change: (it) => `${it.changePct > 0 ? '+' : ''}${inr(it.changePct, 2)}%` },
}

// Merge a live series into an indicator from the CMS. Only indicators with a
// `live` key are touched; everything else keeps its hand-entered values.
export function applyLive(indicator, market) {
  const key = indicator.live?.key
  const it = key && market?.items?.[key]
  if (!it) return indicator
  const f = LIVE_FORMAT[indicator.live.format] || LIVE_FORMAT.index
  const hist = (market.history?.[key] || []).slice(-(indicator.live.points || 60))
  const xKey = indicator.chart?.xKey || 'period'
  const dir = it.change === null || it.change === undefined ? (it.value >= 0 ? 'up' : 'down') : it.change > 0 ? 'up' : it.change < 0 ? 'down' : 'flat'
  return {
    ...indicator,
    currentValue: f.value(it.value),
    previousValue: it.prev === null || it.prev === undefined ? indicator.previousValue : f.value(it.prev),
    change: it.change === null || it.change === undefined ? (indicator.live.format === 'flow' ? f.change(it) : indicator.change) : f.change(it),
    direction: dir,
    asOf: it.asOf,
    source: it.source,
    verified: true,
    liveNote: it.note || null,
    chart: hist.length >= 2
      ? {
          ...indicator.chart,
          type: indicator.live.chartType || indicator.chart?.type || 'line',
          title: indicator.name,
          subtitle: `${it.label || indicator.name}${it.unit ? ` (${it.unit})` : ''}, ${hist.length} most recent readings to ${fmt.date(it.asOf)}`,
          data: hist.map(([d, v]) => ({ [xKey]: d.length === 7 ? d : fmt.shortDate(d), value: v })),
          source: `${it.source}. Updated automatically after each session.`,
        }
      : indicator.chart,
  }
}
