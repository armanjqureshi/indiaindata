// Gold, silver and platinum rates from the India Bullion and Jewellers Association (IBJA),
// published on ibjarates.com twice each working day (AM around noon, PM around 5 pm IST).
// Runs on GitHub Actions and writes live/gold.json; the site reads it at runtime.
//
// What ibjarates.com gives, and what we read:
//  1. "Today's rates" table: AM and PM rates for today, once published.
//  2. "Previous dates rate" table: AM and PM for the last few working days, every purity,
//     silver and platinum.
//  3. The 30-day PDF ("Daily Opening and Closing Market Rate"): AM and PM for each working day
//     of the last 30 days, gold purities and silver (no platinum).
//  4. The chart data in the page (hidden inputs HdnGold, HdnSilver): closing (PM) rates of
//     999 and 916 gold and of silver for about four months. Used for the longer history.
// Units are IBJA's: gold and platinum in Rs per 10 g, silver in Rs per kg, all before GST.
//
// Accuracy rules: nothing is estimated. Stored days are never dropped. Each value must be in a
// sane range and each purity must sit near its expected share of 999 gold; a value that fails
// is left out and logged. Where two sources give the same day and session, they must agree.
// Env: GOLD_LOCAL_DIR to read a saved home.html and last30.pdf instead of downloading.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const OUT = path.join(ROOT, 'live', 'gold.json')
const LOG = path.join(ROOT, 'live', 'gold-log.json')
const RAW = path.join(ROOT, 'data', 'raw', 'gold')
const BASE = 'https://ibjarates.com/'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const log = { runAt: new Date().toISOString(), notes: [], errors: [] }
const LOCAL = process.env.GOLD_LOCAL_DIR

// field -> [min, max] in IBJA units, and expected share of 999 gold (gold purities only)
const FIELDS = {
  g999: { range: [30000, 600000], share: 1 },
  g995: { range: [30000, 600000], share: 0.995 },
  g916: { range: [25000, 560000], share: 0.916 },
  g750: { range: [20000, 460000], share: 0.75 },
  g585: { range: [15000, 360000], share: 0.585 },
  silver: { range: [20000, 1500000] },
  platinum: { range: [10000, 400000] },
}
const LABEL_FIELD = { 'Gold 999': 'g999', 'Gold 995': 'g995', 'Gold 916': 'g916', 'Gold 750': 'g750', 'Gold 585': 'g585', 'Silver 999': 'silver', 'Platinum 999': 'platinum' }

async function get(url, binary = false) {
  let last
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(60000) })
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      return binary ? Buffer.from(await r.arrayBuffer()) : await r.text()
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 5000 * a)) }
  }
  throw last
}

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad = (n) => String(n).padStart(2, '0')
// "16/11/2026" or "16-Nov-26" or "16-Nov-2026" -> "2026-11-16"
function isoDate(s) {
  let m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  m = String(s).trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/)
  if (m && MON[m[2].toLowerCase()]) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(MON[m[2].toLowerCase()])}-${pad(m[1])}`
  return null
}
const num = (v) => {
  const s = String(v ?? '').replace(/[,\s₹]/g, '')
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null
}
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)

// observations: { d, session: 'am'|'pm', field, value, src }
const obs = []
const add = (d, session, field, value, src) => {
  if (d && value != null && FIELDS[field]) obs.push({ d, session, field, value, src })
}

/* ---------- 1 and 2: the home page tables ---------- */
// "Previous dates rate": rows whose first cell is labelled AM or PM and holds the date
function parsePrevious(html) {
  let rows = 0
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const tr = m[1]
    const first = tr.match(/<td[^>]*data-label="(AM|PM)"[^>]*>([\s\S]*?)<\/td>/i)
    if (!first) continue
    const d = isoDate(strip(first[2]))
    if (!d) continue
    const session = first[1].toLowerCase()
    for (const c of tr.matchAll(/<td[^>]*data-label="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g)) {
      const f = LABEL_FIELD[c[1].trim()]
      if (f) add(d, session, f, num(strip(c[2])), 'previous')
    }
    rows++
  }
  return rows
}

// "Today's rates": a table with Purity, AM and PM columns. When rates are not out yet the table
// has id TodayRatesTableDataNo and a "will be uploaded soon" message. We take the date from the
// page if it states one; otherwise today's date in India, but only on a weekday.
function parseToday(html) {
  const tables = [...html.matchAll(/<table[^>]*id="(TodayRates[^"]*)"[^>]*>([\s\S]*?)<\/table>/g)]
  const t = tables.find((x) => !/No$/.test(x[1]))
  if (!t) return { status: tables.length ? 'not published' : 'table not found' }
  const body = t[2]
  const around = strip(html.slice(Math.max(0, t.index - 3000), t.index) + body)
  const dates = [...around.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/g)].map((x) => isoDate(x[1])).filter(Boolean)
  const today = todayIST()
  let d = dates.length ? dates[dates.length - 1] : null
  if (!d) {
    const wd = new Date(today + 'T00:00:00Z').getUTCDay()
    if (wd === 0 || wd === 6) return { status: 'no date on a weekend, skipped' }
    d = today
  }
  if (d > today) return { status: `date ${d} is in the future, skipped` }
  let n = 0
  for (const r of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]))
    if (cells.length < 2) continue
    const label = cells[0].toLowerCase()
    const pur = (label.match(/\b(999|995|916|750|585)\b/) || [])[1]
    const f = /silver/.test(label) ? 'silver' : /platinum/.test(label) ? 'platinum' : pur ? `g${pur}` : null
    if (!f) continue
    const am = num(cells[1]), pm = num(cells[2])
    if (am != null) { add(d, 'am', f, am, 'today'); n++ }
    if (pm != null) { add(d, 'pm', f, pm, 'today'); n++ }
  }
  return { status: n ? 'parsed' : 'no values found', date: d, values: n, datedOnPage: dates.length > 0 }
}

/* ---------- 4: the chart data (closing rates) ---------- */
function hidden(html, id) {
  const m = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))
  const v = m && m[0].match(/value="([^"]*)"/)
  if (!v) return null
  try {
    return JSON.parse(v[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
  } catch { return null }
}
function parseCharts(html) {
  let n = 0
  const g = hidden(html, 'HdnGold')
  if (g?.labels?.length && g.labels.length === g.purity999?.length && g.labels.length === g.purity916?.length) {
    g.labels.forEach((l, i) => { const d = isoDate(l); add(d, 'pm', 'g999', num(g.purity999[i]), 'chart'); add(d, 'pm', 'g916', num(g.purity916[i]), 'chart'); n++ })
  } else log.errors.push('Gold chart data (HdnGold) missing or malformed')
  const s = hidden(html, 'HdnSilver')
  if (s?.labels?.length && s.labels.length === s.silverRate?.length) {
    s.labels.forEach((l, i) => add(isoDate(l), 'pm', 'silver', num(s.silverRate[i]), 'chart'))
  } else log.errors.push('Silver chart data (HdnSilver) missing or malformed')
  return n
}

/* ---------- 3: the 30-day PDF ---------- */
const PDF_ORDER = ['g999', 'g999', 'g995', 'g995', 'g916', 'g916', 'g750', 'g750', 'g585', 'g585', 'silver', 'silver']
function parsePdf(buf) {
  const tmp = path.join(RAW, '_last30.pdf')
  fs.mkdirSync(RAW, { recursive: true })
  fs.writeFileSync(tmp, buf)
  const text = execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8' })
  fs.rmSync(tmp)
  if (!/Opening\s*&\s*Closing Rates for Gold and Silver/i.test(text) || !/Gold 999[\s\S]*Gold 585[\s\S]*Silver/.test(text)) {
    log.errors.push('30-day PDF: header not as expected, skipped')
    return 0
  }
  let n = 0
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(\d{2}-[A-Za-z]{3}-\d{2})\s+(.+)$/)
    if (!m) continue
    const toks = m[2].trim().split(/\s+/)
    if (toks.length !== 12 || !toks.every((t) => /^(\d+|-)$/.test(t))) continue
    const d = isoDate(m[1])
    toks.forEach((t, i) => add(d, i % 2 ? 'pm' : 'am', PDF_ORDER[i], num(t), 'pdf'))
    n++
  }
  return n
}

/* ---------- merge and check ---------- */
function build(stored) {
  // later sources win: chart < pdf < previous < today; they must agree within Rs 1 per unit
  const rank = { stored: 0, chart: 1, pdf: 2, previous: 3, today: 4 }
  const days = new Map()
  const put = (d, session, field, value, src) => {
    if (!days.has(d)) days.set(d, { d, am: {}, pm: {}, src: {} })
    const day = days.get(d)
    const k = `${session}.${field}`
    const prev = day.src[k]
    if (prev && rank[prev.src] > rank[src]) return
    if (prev && prev.value !== value && prev.src !== 'stored' && Math.abs(prev.value - value) > 1) {
      log.errors.push(`${d} ${session} ${field}: ${prev.src} says ${prev.value}, ${src} says ${value}`)
    } else if (prev && prev.src === 'stored' && prev.value !== value) {
      log.notes.push(`${d} ${session} ${field}: revised from ${prev.value} to ${value} (${src})`)
    }
    day[session][field] = value
    day.src[k] = { src, value }
  }
  for (const day of stored?.days || []) {
    for (const s of ['am', 'pm']) for (const [f, v] of Object.entries(day[s] || {})) put(day.d, s, f, v, 'stored')
  }
  for (const o of obs.sort((a, b) => rank[a.src] - rank[b.src])) put(o.d, o.session, o.field, o.value, o.src)

  // range and purity checks
  const out = []
  for (const day of [...days.values()].sort((a, b) => a.d.localeCompare(b.d))) {
    for (const s of ['am', 'pm']) {
      const v = day[s]
      for (const [f, x] of Object.entries(v)) {
        const spec = FIELDS[f]
        const bad = x < spec.range[0] || x > spec.range[1]
          ? 'out of range'
          : spec.share && spec.share !== 1 && v.g999 && Math.abs(x / v.g999 / spec.share - 1) > 0.02 ? `${(x / v.g999).toFixed(3)} of 999 gold, expected about ${spec.share}` : null
        if (bad) {
          log.notes.push(`${day.d} ${s} ${f} = ${x} left out: ${bad}`)
          delete v[f]
        }
      }
    }
    const ordered = (v) => Object.fromEntries(Object.keys(FIELDS).filter((f) => f in v).map((f) => [f, v[f]]))
    const row = { d: day.d }
    if (Object.keys(day.am).length) row.am = ordered(day.am)
    if (Object.keys(day.pm).length) row.pm = ordered(day.pm)
    if (row.am || row.pm) out.push(row)
  }
  return out
}

async function main() {
  const stored = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null
  const html = LOCAL ? fs.readFileSync(path.join(LOCAL, 'home.html'), 'utf8') : await get(BASE)
  if (!/ibja/i.test(html) || html.length < 20000) throw new Error(`Home page looks wrong (${html.length} bytes)`)

  const prev = parsePrevious(html)
  if (!prev) log.errors.push('Previous dates table: no rows found')
  log.previousRows = prev
  log.today = parseToday(html)
  if (log.today.status === 'no values found' || log.today.status === 'table not found') {
    fs.mkdirSync(RAW, { recursive: true })
    fs.writeFileSync(path.join(RAW, `today-unparsed-${todayIST()}.html`), html)
    log.errors.push(`Today's table: ${log.today.status}; page saved to data/raw/gold`)
  }
  log.chartDays = parseCharts(html)

  const pdfHref = (html.match(/href="(?:\.\.\/)?(UploadedFiles\/30DaysPdf\/[^"]+\.pdf)"/i) || [])[1]
  try {
    let buf = null
    if (LOCAL && fs.existsSync(path.join(LOCAL, 'last30.pdf'))) buf = fs.readFileSync(path.join(LOCAL, 'last30.pdf'))
    else if (!LOCAL && pdfHref) buf = await get(BASE + encodeURI(pdfHref), true)
    if (buf && buf.subarray(0, 4).toString() === '%PDF') log.pdfRows = parsePdf(buf)
    else log.errors.push('30-day PDF not found')
  } catch (e) { log.errors.push(`30-day PDF: ${e.message}`) }

  const days = build(stored)
  const last = days[days.length - 1]
  if (!last) throw new Error('No rates parsed')
  if (stored?.days?.length && days.length < stored.days.length) throw new Error('Fewer days than stored; not writing')
  // the newest day must be recent: IBJA publishes every working day
  const age = (Date.parse(todayIST()) - Date.parse(last.d)) / 864e5
  if (age > 6) log.errors.push(`Newest rate is ${age} days old (${last.d})`)

  const data = {
    updatedAt: new Date().toISOString(),
    source: 'India Bullion and Jewellers Association (IBJA)',
    sourceUrl: BASE,
    units: { gold: 'Rs per 10 g', silver: 'Rs per kg', platinum: 'Rs per 10 g' },
    note: 'IBJA rates, before GST and making charges. AM is the opening rate, PM the closing rate.',
    latest: { d: last.d, session: last.pm ? 'pm' : 'am' },
    days,
  }
  const same = stored && JSON.stringify({ ...stored, updatedAt: 0 }) === JSON.stringify({ ...data, updatedAt: 0 })
  if (!same) fs.writeFileSync(OUT, JSON.stringify(data))
  log.days = days.length
  log.latest = data.latest
  log.changed = !same
  console.log(`IBJA: ${days.length} days, newest ${last.d} ${data.latest.session.toUpperCase()}; previous-table rows ${prev}, PDF rows ${log.pdfRows ?? 0}, chart days ${log.chartDays}; today: ${log.today.status}`)
}

try {
  await main()
} catch (e) {
  log.errors.push(`Fatal: ${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`)
  process.exitCode = 1
}
for (const n of log.notes) console.log('note:', n)
for (const e of log.errors) console.error('error:', e)
fs.mkdirSync(path.dirname(LOG), { recursive: true })
fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
