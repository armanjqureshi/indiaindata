// Daily mandi (wholesale market) prices. Source: Agmarknet through the data.gov.in API
// (Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare).
// data.gov.in does not answer requests from outside India, so this job runs on a
// self-hosted runner in India (runs-on: self-hosted).
//
// Writes live/mandi/<commodity>.json for each commodity in src/data/mandi.js:
//   latest   - the latest day: all-India and per-state figures and the markets behind them
//   history  - daily all-India and per-state median of market modal prices
// Accuracy rules (same as the other data jobs):
//  - Only prices the API returned for that date are used; nothing is estimated.
//  - A day with fewer than MIN_MARKETS markets is ignored, not written.
//  - Rows with a non-positive price or a modal price outside [min, max] are dropped.
//  - If a fetch fails the stored file is left as it was; the reason goes to live/mandi-log.json.
// Env: DATAGOVIN_API_KEY (required), BACKFILL_DAYS (default 0: latest day and the one before).
import fs from 'node:fs'
import path from 'node:path'
import { MANDI_COMMODITIES } from '../../src/data/mandi.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..')
const DIR = path.join(ROOT, 'live', 'mandi')
const LOG = path.join(ROOT, 'live', 'mandi-log.json')
const RES = '35985678-0d79-46b4-9ed6-6f13308a1d24'
const KEY = process.env.DATAGOVIN_API_KEY
const BACKFILL = Math.max(0, Number(process.env.BACKFILL_DAYS || 0))
const ONLY = (process.env.MANDI_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean)
const PAGE = 500
const MIN_MARKETS = 8
const HISTORY_MAX = 800
const CONCURRENCY = 3
const log = { runAt: new Date().toISOString(), backfillDays: BACKFILL, accepted: [], notes: [], errors: [] }
if (!KEY) { console.error('DATAGOVIN_API_KEY is not set'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const base = `https://api.data.gov.in/resource/${RES}?api-key=${encodeURIComponent(KEY)}&format=json`
async function get(qs) {
  let last
  for (let a = 1; a <= 4; a++) {
    try {
      const r = await fetch(`${base}&${qs}`, { signal: AbortSignal.timeout(120000) })
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(`HTTP ${r.status} ${JSON.stringify(j.error || '').replace(KEY, '***').slice(0, 120)}`)
      return j
    } catch (e) { last = e; await sleep(3000 * a) }
  }
  throw last
}
const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const isoFromDmy = (s) => { const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const round = (v) => Math.round(v)

async function rowsFor(apiName, iso) {
  const qs = (off) => `limit=${PAGE}&offset=${off}&filters[Commodity]=${encodeURIComponent(apiName)}&filters[Arrival_Date]=${dmy(iso)}`
  const first = await get(qs(0))
  let rows = first.records || []
  for (let off = rows.length; off < (first.total || 0); off += PAGE) {
    const j = await get(qs(off))
    if (!j.records?.length) break
    rows = rows.concat(j.records)
    await sleep(250)
  }
  return rows
}

// rows -> one entry per market, then per-state and all-India summaries
function summarise(rows) {
  const markets = new Map()
  let dropped = 0
  const valid = rows.filter((r) => {
    const min = Number(r.Min_Price), max = Number(r.Max_Price), modal = Number(r.Modal_Price)
    return min > 0 && max >= min && modal >= min && modal <= max && r.State && r.Market
  })
  // drop entries far from the day's median for this commodity (unit slips, typos)
  const mid = median(valid.map((r) => Number(r.Modal_Price)))
  const ok = valid.filter((r) => mid && Number(r.Modal_Price) >= mid * 0.2 && Number(r.Modal_Price) <= mid * 5 && Number(r.Min_Price) >= mid * 0.1 && Number(r.Max_Price) <= mid * 8)
  dropped = rows.length - ok.length
  for (const r0 of ok) {
    const r = { ...r0, State: String(r0.State).trim(), District: String(r0.District).trim(), Market: String(r0.Market).trim() }
    const min = Number(r.Min_Price), max = Number(r.Max_Price), modal = Number(r.Modal_Price)
    const k = `${r.State}|${r.District}|${r.Market}`
    const m = markets.get(k) || { state: r.State, district: r.District, market: r.Market, modals: [], min: Infinity, max: 0 }
    m.modals.push(modal); m.min = Math.min(m.min, min); m.max = Math.max(m.max, max)
    markets.set(k, m)
  }
  const list = [...markets.values()].map((m) => ({ state: m.state, district: m.district, market: m.market, min: round(m.min), max: round(m.max), modal: round(m.modals.reduce((a, b) => a + b, 0) / m.modals.length) }))
  const byState = {}
  for (const m of list) (byState[m.state] ||= []).push(m)
  const sum = (ms) => ({ median: round(median(ms.map((m) => m.modal))), min: Math.min(...ms.map((m) => m.min)), max: Math.max(...ms.map((m) => m.max)), markets: ms.length })
  const states = Object.fromEntries(Object.entries(byState).map(([s, ms]) => [s, { ...sum(ms), list: ms.sort((a, b) => b.modal - a.modal).slice(0, 60).map(({ state, ...rest }) => rest) }]))
  return { markets: list.length, dropped, india: { ...(list.length ? sum(list) : {}), states: Object.keys(states).length }, states }
}

function load(slug) {
  const f = path.join(DIR, `${slug}.json`)
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { history: { india: [], states: {} } }
}
function addHistory(store, iso, day) {
  const put = (arr, row) => { const i = arr.findIndex((x) => x[0] === iso); if (i >= 0) arr[i] = row; else arr.push(row); arr.sort((a, b) => a[0].localeCompare(b[0])); if (arr.length > HISTORY_MAX) arr.splice(0, arr.length - HISTORY_MAX) }
  put(store.history.india, [iso, day.india.median, day.india.markets])
  for (const [s, v] of Object.entries(day.states)) put((store.history.states[s] ||= []), [iso, v.median, v.markets])
}

async function latestDate() {
  const j = await get('limit=1&sort[Arrival_Date]=desc')
  const iso = isoFromDmy(j.records?.[0]?.Arrival_Date)
  if (!iso) throw new Error('could not read the latest Arrival_Date')
  return iso
}

async function doCommodity(c, dates) {
  const store = load(c.slug)
  store.history ||= { india: [], states: {} }
  let changed = false
  for (const iso of dates) {
    try {
      const rows = await rowsFor(c.api, iso)
      const day = summarise(rows)
      if (day.markets < MIN_MARKETS) { log.notes.push(`${c.slug} ${iso}: only ${day.markets} markets, skipped`); continue }
      addHistory(store, iso, day)
      if (!store.latest || iso >= store.latest.date) store.latest = { date: iso, ...day }
      changed = true
      log.accepted.push(`${c.slug} ${iso}: ${day.markets} markets, median ${day.india.median}`)
    } catch (e) { log.errors.push(`${c.slug} ${iso}: ${String(e.message).slice(0, 160)}`) }
  }
  if (changed) {
    store.slug = c.slug; store.commodity = c.api; store.name = c.name
    store.unit = '₹ per quintal'
    store.source = { name: 'Agmarknet, Directorate of Marketing and Inspection, via data.gov.in', url: 'https://agmarknet.gov.in/' }
    store.updatedAt = new Date().toISOString()
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(path.join(DIR, `${c.slug}.json`), JSON.stringify(store))
  }
}

async function main() {
  const latest = await latestDate()
  log.latest = latest
  // latest day and the day before (late reports), plus a backfill window and one year back
  const dates = [latest, addDays(latest, -1)]
  for (let i = 2; i <= BACKFILL; i++) dates.push(addDays(latest, -i))
  if (BACKFILL) for (let i = 0; i < 4; i++) dates.push(addDays(latest, -365 - i))
  const list = MANDI_COMMODITIES.filter((c) => !ONLY.length || ONLY.includes(c.slug))
  let next = 0
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < list.length) { const c = list[next++]; await doCommodity(c, dates); console.log(`done ${c.slug}`) }
  }))
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
  console.log(JSON.stringify({ accepted: log.accepted.length, notes: log.notes.length, errors: log.errors.slice(0, 10) }, null, 1))
}
main().catch((e) => { log.errors.push(String(e.message || e)); fs.writeFileSync(LOG, JSON.stringify(log, null, 1)); console.error(e); process.exit(0) })
