// Scheduled market-close update. Runs on GitHub Actions after Indian market
// hours. Writes live/market.json, which the site reads at runtime, so no
// Netlify rebuild is needed.
//
// Accuracy rules:
//  - Every value comes from a named source with its own date.
//  - A value is only written if it parses, its date is not older than what is
//    stored, and it passes sanity checks (size of move, continuity with the
//    previous stored close, and cross-checks where available).
//  - If a source fails or a check fails, the stored value is kept as it was
//    and the failure is recorded in live/market-log.json.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createNseSession, fetchText, isoDate, num, todayIST, UA } from './http.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const LIVE = path.join(ROOT, 'live')
const FILE = path.join(LIVE, 'market.json')
const LOG = path.join(LIVE, 'market-log.json')
const DEBUG = process.env.DEBUG_DIR || ''
const HISTORY_MAX = 400

const store = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { items: {}, history: {} }
store.items ||= {}
store.history ||= {}
const log = { runAt: new Date().toISOString(), accepted: [], skipped: [], errors: [] }
const dbg = (name, data) => {
  if (!DEBUG) return
  fs.mkdirSync(DEBUG, { recursive: true })
  fs.writeFileSync(path.join(DEBUG, name), typeof data === 'string' ? data : JSON.stringify(data, null, 1))
}

// --- trading calendar ---------------------------------------------------------
const nse = createNseSession()
let holidays = new Set()
try {
  const h = await nse.get('/api/holiday-master?type=trading')
  for (const d of h.CM || []) holidays.add(isoDate(d.tradingDate))
} catch (e) {
  log.errors.push('holiday calendar: ' + e.message)
}
const isTradingDay = (iso) => {
  const wd = new Date(iso + 'T00:00:00Z').getUTCDay()
  return wd !== 0 && wd !== 6 && !holidays.has(iso)
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const prevTradingDay = (iso) => {
  let d = addDays(iso, -1)
  for (let i = 0; i < 12 && !isTradingDay(d); i++) d = addDays(d, -1)
  return d
}

// --- write helpers --------------------------------------------------------------
const pct = (a, b) => (b ? ((a - b) / b) * 100 : null)
const round = (v, dp) => (v === null || v === undefined ? null : Math.round(v * 10 ** dp) / 10 ** dp)

/**
 * Accept a new reading for `key` if it passes checks.
 * reading: { value, prev?, asOf, source, sourceUrl?, unit, dp, maxMovePct, label }
 */
function accept(key, r) {
  const old = store.items[key]
  if (!Number.isFinite(r.value)) return log.skipped.push(`${key}: value not numeric`)
  if (!r.asOf || r.asOf > todayIST()) return log.skipped.push(`${key}: bad date ${r.asOf}`)
  if (old && old.asOf > r.asOf) return log.skipped.push(`${key}: source date ${r.asOf} older than stored ${old.asOf}`)
  if (old && old.asOf === r.asOf && old.value === r.value) return // unchanged
  const prev = Number.isFinite(r.prev) ? r.prev : old && old.asOf < r.asOf ? old.value : old?.prev ?? null
  // continuity: if we hold the previous session's close, the source's previous close must match it
  if (old && Number.isFinite(r.prev) && old.asOf < r.asOf && r.checkContinuity !== false) {
    const expectedPrevDate = r.prevDate || null
    if ((!expectedPrevDate || old.asOf === expectedPrevDate) && Math.abs(pct(r.prev, old.value)) > (r.continuityTolPct ?? 0.05))
      return log.errors.push(`${key}: continuity check failed (source prev ${r.prev}, stored ${old.value} on ${old.asOf})`)
  }
  const movePct = prev ? pct(r.value, prev) : null
  if (movePct !== null && r.maxMovePct && Math.abs(movePct) > r.maxMovePct)
    return log.errors.push(`${key}: move of ${movePct.toFixed(2)}% exceeds ${r.maxMovePct}% sanity limit`)
  store.items[key] = {
    label: r.label,
    value: round(r.value, r.dp ?? 2),
    prev: prev === null ? null : round(prev, r.dp ?? 2),
    change: prev === null ? null : round(r.value - prev, r.dp ?? 2),
    changePct: movePct === null ? null : round(movePct, 2),
    asOf: r.asOf,
    unit: r.unit || '',
    source: r.source,
    sourceUrl: r.sourceUrl || null,
    note: r.note || null,
    updatedAt: new Date().toISOString(),
  }
  const h = (store.history[key] ||= [])
  const i = h.findIndex((p) => p[0] === r.asOf)
  if (i >= 0) h[i] = [r.asOf, store.items[key].value]
  else h.push([r.asOf, store.items[key].value])
  h.sort((a, b) => a[0].localeCompare(b[0]))
  if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX)
  log.accepted.push(`${key} = ${store.items[key].value} (${r.asOf})`)
}

function addHistory(key, asOf, value) {
  const h = (store.history[key] ||= [])
  if (!h.some((p) => p[0] === asOf)) h.push([asOf, value])
  h.sort((a, b) => a[0].localeCompare(b[0]))
  if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX)
}

// --- 1. NSE end-of-day index file (official closing values) --------------------
const INDICES = [
  ['nifty-50', 'Nifty 50', 'Nifty 50', 15],
  ['nifty-bank', 'Nifty Bank', 'Nifty Bank', 15],
  ['nifty-it', 'Nifty IT', 'Nifty IT', 15],
  ['nifty-midcap-150', 'Nifty Midcap 150', 'Nifty Midcap 150', 15],
  ['nifty-smallcap-250', 'Nifty Smallcap 250', 'Nifty Smallcap 250', 15],
  ['india-vix', 'India VIX', 'India VIX', 80],
]
const ddmmyyyy = (iso) => iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4)
async function indexFile(iso) {
  const url = `https://nsearchives.nseindia.com/content/indices/ind_close_all_${ddmmyyyy(iso)}.csv`
  const { text } = await fetchText(url, { headers: { Referer: 'https://www.nseindia.com/' }, retries: 1 })
  if (!/Index Name/.test(text)) throw new Error('unexpected index file format')
  const rows = {}
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const c = line.split(',')
    rows[c[0].trim()] = { date: isoDate(c[1]), close: num(c[5]), change: num(c[6]), url }
  }
  return rows
}
let nseDate = null
let niftyPct = null
{
  let d = todayIST()
  for (let tries = 0; tries < 8; tries++, d = addDays(d, -1)) {
    if (!isTradingDay(d)) continue
    try {
      const rows = await indexFile(d)
      nseDate = d
      for (const [key, name, label, maxMove] of INDICES) {
        const r = rows[name]
        if (!r || r.date !== d) { log.skipped.push(`${key}: not in index file for ${d}`); continue }
        accept(key, {
          label, value: r.close, prev: r.close - r.change, asOf: d, prevDate: prevTradingDay(d),
          source: 'NSE end-of-day index file', sourceUrl: r.url, dp: 2, maxMovePct: maxMove,
        })
        if (key === 'nifty-50') niftyPct = pct(r.close, r.close - r.change)
      }
      break
    } catch (e) {
      if (tries === 7) log.errors.push('NSE index file: ' + e.message)
    }
  }
}

// One-off backfill of index history from past daily files (set BACKFILL_DAYS).
const backfillDays = Number(process.env.BACKFILL_DAYS || 0)
if (backfillDays > 0) {
  let d = addDays(todayIST(), -1)
  let done = 0
  for (let i = 0; i < backfillDays * 1.6 && done < backfillDays; i++, d = addDays(d, -1)) {
    if (!isTradingDay(d)) continue
    try {
      const rows = await indexFile(d)
      for (const [key, name] of INDICES) if (rows[name]?.date === d) addHistory(key, d, rows[name].close)
      done++
    } catch {}
  }
  log.accepted.push(`backfilled ${done} days of index history`)
}

// --- 2. Sensex (no official feed reachable from CI: moneycontrol price feed,
//         cross-checked against the Nifty's move on the same day) -------------
try {
  const j = JSON.parse((await fetchText('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%3BSEN')).text)
  const d = j.data
  dbg('sensex.json', d)
  const value = num(d.pricecurrent), prev = num(d.priceprevclose)
  const upd = d.lastupd ? isoDate(String(d.lastupd).slice(0, 10)) : null
  const asOf = upd || nseDate
  const sPct = pct(value, prev)
  if (!nseDate) log.skipped.push('sensex: no NSE date to cross-check against')
  else if (asOf !== nseDate) log.skipped.push(`sensex: feed date ${asOf} does not match NSE session ${nseDate}`)
  else if (niftyPct !== null && Math.abs(sPct - niftyPct) > 1.5) log.errors.push(`sensex: move ${sPct.toFixed(2)}% inconsistent with Nifty ${niftyPct.toFixed(2)}%`)
  else if (Math.abs(value - prev - num(d.pricechange)) > 0.05) log.errors.push('sensex: feed internally inconsistent')
  else accept('sensex', { label: 'BSE Sensex', value, prev, asOf, prevDate: prevTradingDay(asOf), source: 'BSE Sensex close (via Moneycontrol price feed; cross-checked against the Nifty 50)', dp: 2, maxMovePct: 15 })
} catch (e) {
  log.errors.push('sensex: ' + e.message)
}

// --- 3. FBIL reference rates (official INR benchmark, published via NSE) -------
try {
  const j = await nse.get('/api/NextApi/apiClient?functionName=getReferenceRates&&type=null&&flag=CUR')
  dbg('fbil.json', j)
  const asOf = isoDate(j.data.timeStamp)
  const map = { USD: ['usd-inr', 'USD / INR', 1], EURO: ['eur-inr', 'EUR / INR', 1], GBP: ['gbp-inr', 'GBP / INR', 1], YEN: ['jpy-inr', 'JPY / INR (per 100 yen)', 100] }
  for (const r of j.data.currencySpotRates || []) {
    const m = map[r.currency]
    if (!m || num(r.unit) !== m[2]) continue
    accept(m[0], {
      label: m[1], value: num(r.value), prev: num(r.prevDayValue), asOf, checkContinuity: false,
      source: 'FBIL reference rate (published by NSE)', sourceUrl: 'https://www.fbil.org.in/', dp: 4, maxMovePct: 5,
      note: `Fixed at ${String(j.data.timeStamp).slice(-8, -3)} IST`,
    })
  }
} catch (e) {
  log.errors.push('FBIL reference rates: ' + e.message)
}

// --- 4. FII/DII provisional cash-market flows (NSE) -------------------------------
try {
  const j = await nse.get('/api/fiidiiTradeReact')
  dbg('fiidii.json', j)
  for (const r of j) {
    const key = /FII|FPI/i.test(r.category) ? 'fii-net' : /DII/i.test(r.category) ? 'dii-net' : null
    if (!key) continue
    const asOf = isoDate(r.date)
    const old = store.items[key]
    accept(key, {
      label: key === 'fii-net' ? 'FII/FPI net (cash market)' : 'DII net (cash market)',
      value: num(r.netValue), prev: old && old.asOf < asOf ? old.value : undefined, asOf, checkContinuity: false,
      source: 'NSE provisional FII/DII trading data (NSE, BSE and MSEI combined)', sourceUrl: 'https://www.nseindia.com/reports/fii-dii', unit: '₹ cr', dp: 2,
      note: `Buy ₹${r.buyValue} cr, sell ₹${r.sellValue} cr`,
    })
  }
} catch (e) {
  log.errors.push('FII/DII: ' + e.message)
}

// --- 5. IBJA gold and silver benchmark rates ---------------------------------------
try {
  const html = (await fetchText('https://ibjarates.com/', { headers: { Accept: 'text/html' } })).text
  dbg('ibja.html', html)
  const parsed = parseIbja(html)
  dbg('ibja-parsed.json', parsed)
  if (parsed.latest) {
    for (const [key, label, field, max] of [['gold-ibja', 'Gold 999 (IBJA, per 10 g)', 'gold999', 10], ['silver-ibja', 'Silver 999 (IBJA, per kg)', 'silver999', 15]]) {
      const v = parsed.latest[field]
      if (!Number.isFinite(v)) continue
      accept(key, { label, value: v, asOf: parsed.latest.date, source: `IBJA ${parsed.latest.session} rate (excl. GST and making charges)`, sourceUrl: 'https://ibjarates.com/', unit: '₹', dp: 0, maxMovePct: max, checkContinuity: false })
    }
    for (const row of parsed.history) {
      if (Number.isFinite(row.gold999)) addHistory('gold-ibja', row.date, row.gold999)
      if (Number.isFinite(row.silver999)) addHistory('silver-ibja', row.date, row.silver999)
    }
  } else log.skipped.push('IBJA: could not identify dated PM rates')
} catch (e) {
  log.errors.push('IBJA: ' + e.message)
}

function parseIbja(html) {
  // The "Previous Dates Rate" block has two tab panes, #tab-am and #tab-pm,
  // each a table of dated rows: date | Gold 999 | 995 | 916 | 750 | 585 | Silver 999 | Platinum 999.
  const pane = (id) => {
    const i = html.indexOf(`id="${id}"`)
    if (i < 0) return ''
    const rest = html.slice(i + 10)
    const j = rest.search(/id="tab-(am|pm)"/)
    return j >= 0 ? rest.slice(0, j) : rest
  }
  const rowsOf = (seg, session) =>
    [...seg.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
      .map((r) => [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()))
      .filter((c) => c.length >= 7 && /^\d{2}\/\d{2}\/\d{4}$/.test(c[0]))
      .map((c) => ({ date: isoDate(c[0].replace(/\//g, '-')), session, gold999: num(c[1]), silver999: num(c[6]) }))
  const pm = rowsOf(pane('tab-pm'), 'PM').sort((a, b) => b.date.localeCompare(a.date))
  return { history: pm, latest: pm[0] ? { ...pm[0], session: 'PM (closing)' } : null }
}

// --- 6. Brent crude spot (US EIA, daily, published with a lag) -------------------
try {
  const html = (await fetchText('https://www.eia.gov/dnav/pet/hist/rbrteD.htm', { headers: { Accept: 'text/html' } })).text
  dbg('eia.html', html.slice(-20000))
  const series = parseEia(html)
  dbg('eia-parsed.json', series.slice(-15))
  if (series.length) {
    const last = series[series.length - 1]
    const before = series[series.length - 2]
    accept('brent-spot', { label: 'Brent crude spot (FOB)', value: last[1], prev: before?.[1], asOf: last[0], checkContinuity: false, source: 'US Energy Information Administration, Europe Brent spot price FOB', sourceUrl: 'https://www.eia.gov/dnav/pet/hist/rbrteD.htm', unit: 'US$/bbl', dp: 2, maxMovePct: 25, note: 'Physical spot price; EIA publishes it with a lag of several days. Futures prices quoted in the news can differ.' })
    for (const [d, v] of series.slice(-120)) addHistory('brent-spot', d, v)
  } else log.skipped.push('EIA: no rows parsed')
} catch (e) {
  log.errors.push('EIA Brent: ' + e.message)
}

function parseEia(html) {
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
  const out = []
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    if (cells.length < 6) continue
    const m = cells[0].match(/^(\d{4})\s+([A-Z][a-z]{2})-\s?(\d{1,2})\s+to/)
    if (!m) continue
    const start = Date.UTC(+m[1], MON[m[2]], +m[3])
    for (let i = 0; i < 5; i++) {
      const v = num(cells[1 + i])
      if (v === null) continue
      out.push([new Date(start + i * 864e5).toISOString().slice(0, 10), v])
    }
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]))
}

// --- 7. FPI net equity investment, month to date (NSDL) --------------------------
try {
  const h = await fetch('https://www.fpi.nsdl.co.in/web/Default.aspx', { headers: { 'User-Agent': UA } })
  const cookie = (h.headers.getSetCookie?.() || []).map((x) => x.split(';')[0]).join('; ')
  await h.text()
  const r = await fetch('https://www.fpi.nsdl.co.in/web/Reports/Monthly.aspx', { headers: { 'User-Agent': UA, Cookie: cookie, Referer: 'https://www.fpi.nsdl.co.in/web/Default.aspx' } })
  const html = await r.text()
  dbg('nsdl.html', html)
  const days = parseNsdl(html)
  dbg('nsdl-parsed.json', days)
  if (days.length) {
    const month = days[days.length - 1].date.slice(0, 7)
    const inMonth = days.filter((d) => d.date.startsWith(month))
    const mtd = inMonth.reduce((s, d) => s + d.equityNet, 0)
    const asOf = inMonth[inMonth.length - 1].date
    const old = store.items['fpi-equity-mtd']
    // when a new month starts, keep the completed month's total in the monthly history
    if (old && old.asOf.slice(0, 7) < month) addHistory('fpi-equity-monthly', old.asOf.slice(0, 7), old.value)
    accept('fpi-equity-mtd', { label: 'FPI net equity investment, month to date', value: mtd, asOf, checkContinuity: false, source: 'NSDL, daily trends in FPI investment (equity, all routes)', sourceUrl: 'https://www.fpi.nsdl.co.in/web/Reports/Monthly.aspx', unit: '₹ cr', dp: 2, note: `Sum of ${inMonth.length} reporting days in ${month}` })
    store.items['fpi-equity-mtd'].prev = null
    store.items['fpi-equity-mtd'].change = null
    store.items['fpi-equity-mtd'].changePct = null
  } else log.skipped.push('NSDL: no daily equity rows parsed')
} catch (e) {
  log.errors.push('NSDL FPI: ' + e.message)
}

function parseNsdl(html) {
  // Rows: Reporting Date | Debt/Equity... | Investment Route | Gross Purchases | Gross Sales | Net Investment | Net USD | Conversion
  // We read the "Sub-total" line that follows each date's Equity block.
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()))
  const out = []
  let date = null, section = null
  for (const c of rows) {
    if (c[0] && /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(c[0])) { date = isoDate(c[0]); section = null }
    const joined = c.join('|')
    if (/(^|\|)Equity(\||$)/.test(joined)) section = 'equity'
    else if (/(^|\|)(Debt|Hybrid|Debt-General Limit|Debt-VRR|Debt-FAR|Mutual Funds|AIFs)/.test(joined)) section = 'other'
    if (date && section === 'equity' && /Sub-total/i.test(joined)) {
      const nums = c.map((x) => x.replace(/[()]/g, (m) => (m === '(' ? '-' : ''))).map(num).filter((x) => x !== null)
      // Sub-total row: gross purchases, gross sales, net investment, net USD, ...
      if (nums.length >= 3) out.push({ date, equityNet: nums[2] })
      section = 'done'
    }
  }
  const seen = new Map()
  for (const d of out) seen.set(d.date, d)
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// --- save ------------------------------------------------------------------------------
if (log.accepted.length) store.updatedAt = new Date().toISOString()
if (nseDate) store.session = nseDate
fs.mkdirSync(LIVE, { recursive: true })
fs.writeFileSync(FILE, JSON.stringify(store, null, 1) + '\n')
fs.writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n')
console.log(JSON.stringify(log, null, 1))
