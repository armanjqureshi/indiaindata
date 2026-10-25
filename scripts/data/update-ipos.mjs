// Scheduled IPO update. Pulls every IPO listed on NSE (mainboard and NSE
// Emerge SME) from NSE's public data, adds consolidated subscription and
// issue details for active issues, and listing-day and latest prices from
// NSE's official end-of-day files. Writes live/ipos.json (index of all
// issues) and live/ipo/<slug>.json (detail per issue).
//
// Accuracy rules: only values NSE publishes are stored, each detail file
// records when NSE last updated it, and derived numbers (issue size in rupees,
// gains) are computed from those values with the method written alongside.
// Expected dates use SEBI's T+3 timetable and NSE's holiday calendar and are
// flagged "expected" until NSE confirms a listing date.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { createNseSession, fetchText, isoDate, num, todayIST, UA } from './http.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const LIVE = path.join(ROOT, 'live')
const DETAIL_DIR = path.join(LIVE, 'ipo')
const INDEX = path.join(LIVE, 'ipos.json')
const LOG = path.join(LIVE, 'ipos-log.json')
const BACKFILL = Number(process.env.IPO_BACKFILL_DAYS || 0) // listing prices for listings in the last N days
fs.mkdirSync(DETAIL_DIR, { recursive: true })

const log = { runAt: new Date().toISOString(), notes: [], errors: [] }
const nse = createNseSession()
const today = todayIST()

// --- calendar ------------------------------------------------------------------
let holidays = new Set()
let haveHolidays = false
try {
  const h = await nse.get('/api/holiday-master?type=trading')
  for (const d of h.CM || []) holidays.add(isoDate(d.tradingDate))
  haveHolidays = holidays.size > 0
} catch (e) { log.errors.push('holidays: ' + e.message) }
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const isTradingDay = (iso) => { const wd = new Date(iso + 'T00:00:00Z').getUTCDay(); return wd !== 0 && wd !== 6 && !holidays.has(iso) }
const nextTradingDay = (iso, n = 1) => { let d = iso; for (let k = 0; k < n; ) { d = addDays(d, 1); if (isTradingDay(d)) k++ } return d }
// Holiday calendar only covers the current year; don't project dates beyond it.
const canProject = (iso) => haveHolidays && iso.slice(0, 4) === today.slice(0, 4)

// --- helpers ---------------------------------------------------------------------
const slugify = (name) =>
  name.toLowerCase().replace(/&/g, ' and ').replace(/\b(limited|ltd)\b\.?/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const priceRange = (s) => {
  const m = String(s || '').replace(/,/g, '').replace(/Rs\.?\s*/gi, '').match(/([\d.]+)\s*(?:to|-)\s*(?:Rs\.?\s*)?([\d.]+)/i)
  if (m) return [num(m[1]), num(m[2])]
  const one = num(String(s || '').replace(/Rs\.?/i, ''))
  return one ? [one, one] : [null, null]
}
const boardOf = (series) => (series === 'SME' || series === 'SM' || series === 'ST' ? 'sme' : series === 'EQ' || series === 'BE' ? 'mainboard' : null)
const read = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d)
const write = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n')

const prevIndex = read(INDEX, { ipos: [] })
const prevArchiveAll = read(path.join(LIVE, 'ipos-archive.json'), { ipos: [] })
const prevBySym = new Map([...prevArchiveAll.ipos, ...prevIndex.ipos].map((i) => [i.symbol + '|' + i.board, i]))

// --- 1. every issue NSE lists ----------------------------------------------------------
const past = await nse.get('/api/public-past-issues')
let upcoming = []
let current = []
try { upcoming = await nse.get('/api/all-upcoming-issues?category=ipo') } catch (e) { log.errors.push('upcoming: ' + e.message) }
try { current = await nse.get('/api/ipo-current-issue') } catch (e) { log.errors.push('current: ' + e.message) }

const bySym = new Map()
function upsert(e) {
  const board = boardOf(e.series || e.securityType)
  if (!board || !e.symbol) return
  const key = e.symbol + '|' + board
  const name = (e.companyName || e.company || '').trim()
  const [low, high] = priceRange(e.priceRange || e.issuePrice)
  const issuePriceFinal = e.issuePrice && !/to/i.test(e.issuePrice) && e.issuePrice !== '-' ? num(String(e.issuePrice).replace(/Rs\.?/i, '')) : null
  const cur = bySym.get(key) || {}
  bySym.set(key, {
    ...cur,
    symbol: e.symbol,
    board,
    series: e.series || e.securityType,
    name: name || cur.name,
    open: isoDate(e.ipoStartDate || e.issueStartDate) || cur.open || null,
    close: isoDate(e.ipoEndDate || e.issueEndDate) || cur.close || null,
    priceLow: low ?? cur.priceLow ?? null,
    priceHigh: high ?? cur.priceHigh ?? null,
    issuePrice: issuePriceFinal ?? cur.issuePrice ?? null,
    listingDate: isoDate(e.listingDate) || cur.listingDate || null,
    sharesOffered: num(e.issueSize) ?? cur.sharesOffered ?? null,
    nseStatus: e.status || cur.nseStatus || null,
  })
}
for (const e of past) upsert(e)
for (const e of upcoming) upsert(e)
for (const e of current) upsert(e)

// NSE removes an issue from its current list when bidding ends and adds it to past
// issues only after listing. Keep unlisted issues from the previous run in between,
// so they do not disappear for the days before listing.
for (const p of prevIndex.ipos) {
  const key = p.symbol + '|' + p.board
  if (bySym.has(key)) continue
  if (p.status === 'listed' || p.status === 'unlisted') continue
  if (!p.close || p.close < addDays(today, -30)) continue
  bySym.set(key, {
    symbol: p.symbol,
    board: p.board,
    series: p.series || null,
    name: p.name,
    open: p.open,
    close: p.close,
    priceLow: p.priceLow ?? null,
    priceHigh: p.priceHigh ?? null,
    issuePrice: p.issuePrice ?? null,
    listingDate: p.listingDate || null,
    sharesOffered: p.sharesOffered ?? null,
    nseStatus: p.nseStatus || null,
  })
  log.notes.push(`kept ${p.symbol}: not in NSE lists, bidding closed ${p.close}, not yet listed`)
}

// --- 2. lifecycle status and timetable ---------------------------------------------------
function timetable(ipo) {
  const t = { open: ipo.open, close: ipo.close, allotment: null, refunds: null, demat: null, listing: ipo.listingDate, expected: {} }
  if (ipo.close && canProject(ipo.close) && ipo.close >= '2023-12-01') {
    // SEBI T+3: allotment T+1, refunds and demat credit T+2, listing T+3 (working days)
    t.allotment = nextTradingDay(ipo.close, 1)
    t.refunds = t.demat = nextTradingDay(ipo.close, 2)
    if (!t.listing) { t.listing = nextTradingDay(ipo.close, 3); t.expected.listing = true }
    t.expected.allotment = t.expected.refunds = t.expected.demat = true
  }
  return t
}
function statusOf(ipo, t) {
  if (ipo.listingDate && ipo.listingDate <= today) return 'listed'
  // NSE gives no listing date for a few old issues (withdrawn, or listed elsewhere)
  if (!ipo.listingDate && ipo.close && ipo.close < addDays(today, -20)) return 'unlisted'
  if (ipo.open && today < ipo.open) return 'upcoming'
  if (ipo.open && ipo.close && today >= ipo.open && today <= ipo.close) return 'open'
  if (ipo.close && today > ipo.close) return 'closed'
  return 'upcoming'
}

// --- 3. detail for active and recent issues ----------------------------------------------------
const CAT = [
  [/^Qualified Institutional Buyers/i, 'qib', 'QIB'],
  [/Non Institutional Investors\(Bid amount of more than Ten Lakh/i, 'bnii', 'NII above ₹10 lakh'],
  [/Non Institutional Investors\(Bid amount of more than Two Lakh/i, 'snii', 'NII ₹2–10 lakh'],
  [/^Non Institutional Investors$/i, 'nii', 'NII'],
  [/^Retail Individual Investors/i, 'retail', 'Retail'],
  [/^Employees/i, 'employee', 'Employees'],
  [/^Shareholders?/i, 'shareholder', 'Shareholders'],
  [/^Policy ?holders?/i, 'policyholder', 'Policyholders'],
  [/^Market Maker/i, 'marketMaker', 'Market maker'],
  [/^Total/i, 'total', 'Total'],
]
function infoMap(detail) {
  const m = {}
  for (const r of detail?.issueInfo?.dataList || []) if (r.title) m[r.title.trim()] = String(r.value || '').replace(/^"|"$/g, '').trim()
  return m
}
const clean = (s) => (s || '').replace(/<a [^>]*>(.*?)<\/a>/gi, '$1').replace(/\s+/g, ' ').trim()
function parseMoneyCr(s) {
  // "Rs. 28,300 million" / "Rs 500 crore" / "₹ 1,450 Crores" / "Rs. 41.26 lakhs"
  const m = s.match(/(?:Rs\.?|₹|INR)\s*([\d,.]+)\s*(million|mn|crores?|cr|lakhs?|lacs?|billion)/i)
  if (!m) return null
  const v = num(m[1]), u = m[2].toLowerCase()
  if (u.startsWith('million') || u === 'mn') return v / 10
  if (u.startsWith('billion')) return v * 100
  if (u.startsWith('cr')) return v
  if (u.startsWith('la')) return v / 100
  return null
}
const sharesIn = (s) => { const m = s.match(/([\d,]{4,})\s*(?:Equity\s*)?Shares/i); return m ? num(m[1]) : null }
function parseIssueSize(text, price) {
  // Returns { freshCr, ofsCr, totalCr, method } or null if the text is not unambiguous.
  // Bracketed notes (employee, anchor and market-maker portions) are ignored: they
  // are parts of the issue, not additions to it.
  if (!text || !price) return null
  const t = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ')
  const iF = t.search(/fresh issue/i)
  const iO = t.search(/offer for sale/i)
  if (iF < 0 && iO < 0) return null
  const fresh = iF >= 0 ? t.slice(iF, iO > iF ? iO : undefined) : ''
  const ofs = iO >= 0 ? t.slice(iO, iF > iO ? iF : undefined) : ''
  const value = (part) => {
    const amt = parseMoneyCr(part)
    if (amt !== null) return amt
    const sh = sharesIn(part)
    return sh ? (sh * price) / 1e7 : null
  }
  const freshCr = iF >= 0 ? value(fresh) : 0
  const ofsCr = iO >= 0 ? value(ofs) : 0
  if (freshCr === null || ofsCr === null) return null
  const r2 = (v) => Math.round(v * 100) / 100
  return { freshCr: r2(freshCr), ofsCr: r2(ofsCr), totalCr: r2(freshCr + ofsCr), method: `Calculated at ₹${price} per share from the issue size NSE publishes` }
}
async function fetchDetail(ipo) {
  const series = ipo.board === 'sme' ? 'SME' : 'EQ'
  const d = await nse.get(`/api/ipo-detail?symbol=${encodeURIComponent(ipo.symbol)}&series=${series}`)
  const info = infoMap(d)
  const cats = []
  for (const r of d?.activeCat?.dataList || []) {
    const cat = (r.category || '').trim()
    const hit = CAT.find(([re]) => re.test(cat))
    if (!hit || !/^\d+(\.\d+)?$|^Total/i.test(String(r.srNo || cat))) continue
    const times = num(r.noOfTotalMeant)
    if (times === null || !num(r.noOfShareOffered)) continue
    cats.push({ key: hit[1], label: hit[2], offered: num(r.noOfShareOffered), bid: num(r.noOfSharesBid), times: Math.round(times * 100) / 100 })
  }
  // Prefer NSE's own consolidated total; otherwise compute it from the category rows.
  let total = cats.find((c) => c.key === 'total')?.times ?? num(d?.demandGraphALL?.noOfTimesIssueSubscribed)
  let totalMethod = 'NSE'
  if (total === null || total === undefined) {
    const top = cats.filter((c) => ['qib', 'nii', 'retail', 'employee', 'shareholder', 'policyholder'].includes(c.key) && c.offered)
    const off = top.reduce((a, c) => a + c.offered, 0), bid = top.reduce((a, c) => a + c.bid, 0)
    if (off > 0) { total = bid / off; totalMethod = 'calculated from category bids' }
  }
  const asOf = (d?.activeCat?.updateTime || d?.demandGraphALL?.timestamp || '').replace(/^(Updated as on|As on)\s*/i, '').replace(/\s*IST$/, '') || null
  const lot = num((info['Bid Lot'] || info['Lot Size'] || info['Minimum Order Quantity'] || '').match(/[\d,]+/)?.[0])
  const docs = {}
  for (const [k, label] of [['Red Herring Prospectus', 'Red herring prospectus'], ['Anchor Allocation Report', 'Anchor allocation'], ['Ratios / Basis of Issue Price', 'Basis of issue price']])
    if (/^https?:\/\//.test(info[k] || '')) docs[label] = info[k]
  const price = ipo.issuePrice || ipo.priceHigh
  return {
    subscription: cats.length || total ? { total: total !== null && total !== undefined ? Math.round(total * 100) / 100 : null, totalMethod, categories: cats, asOf, scope: 'NSE and BSE combined' } : null,
    lotSize: lot || null,
    faceValue: num((info['Face Value'] || '').match(/[\d.]+/)?.[0]) || null,
    issueType: clean(info['Issue Type']) || null,
    issueSizeText: clean(info['Issue Size']) || null,
    issueSize: parseIssueSize(clean(info['Issue Size']), price),
    employeeDiscount: clean(info['Discount']) || null,
    retailMax: clean(info['Maximum Subscription Amount for Retail Investor']) || null,
    leadManagers: clean(info['Book Running Lead Managers']).split(/,\s*|\s+and\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean),
    registrar: clean(info['Name of the Registrar']) || null,
    registrarContact: clean(info['Contact person name number and Email id']) || null,
    marketTimings: clean(info['IPO Market Timings']) || null,
    documents: docs,
    fetchedAt: new Date().toISOString(),
  }
}

// --- 4. prices from NSE end-of-day files --------------------------------------------------------
const bhavCache = new Map()
const ddmmyyyy = (iso) => iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4)
const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
async function getBuffer(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.nseindia.com/' }, signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}
function unzipFirst(buf) {
  const tmp = fs.mkdtempSync('/tmp/bhav-')
  fs.writeFileSync(tmp + '/f.zip', buf)
  execFileSync('unzip', ['-o', '-q', tmp + '/f.zip', '-d', tmp])
  const f = fs.readdirSync(tmp).find((x) => x.endsWith('.csv'))
  const s = fs.readFileSync(tmp + '/' + f, 'utf8')
  fs.rmSync(tmp, { recursive: true, force: true })
  return s
}
function csvRows(s) {
  const lines = s.trim().split(/\r?\n/)
  const head = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((l) => { const c = l.split(','); const o = {}; head.forEach((h, i) => (o[h] = (c[i] || '').trim())); return o })
}
// Returns Map(symbol|board -> {open, close}) for a date, from the main and SME files.
async function bhav(iso) {
  if (bhavCache.has(iso)) return bhavCache.get(iso)
  const out = new Map()
  const put = (sym, series, open, close) => { const b = boardOf(series); if (b && Number.isFinite(close)) out.set(sym + '|' + b, { open, close }) }
  try {
    if (iso >= '2024-07-08') {
      const [y, m, d] = iso.split('-')
      const s = unzipFirst(await getBuffer(`https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${y}${m}${d}_F_0000.csv.zip`))
      for (const r of csvRows(s)) put(r.TckrSymb, r.SctySrs, num(r.OpnPric), num(r.ClsPric))
    } else {
      const [y, m, d] = iso.split('-')
      const s = unzipFirst(await getBuffer(`https://nsearchives.nseindia.com/content/historical/EQUITIES/${y}/${MONS[+m - 1]}/cm${d}${MONS[+m - 1]}${y}bhav.csv.zip`))
      for (const r of csvRows(s)) put(r.SYMBOL, r.SERIES, num(r.OPEN), num(r.CLOSE))
    }
  } catch (e) { log.notes.push(`main bhavcopy ${iso}: ${e.message}`) }
  try {
    const s = (await getBuffer(`https://nsearchives.nseindia.com/archives/sme/bhavcopy/sme${ddmmyyyy(iso)}.csv`)).toString('utf8')
    if (/SYMBOL/i.test(s)) for (const r of csvRows(s)) put(r.SYMBOL, r.SERIES === 'SM' || r.SERIES === 'ST' ? 'SME' : r.SERIES, num(r.OPEN_PRICE), num(r.CLOSE_PRICE))
  } catch (e) { /* SME archive only keeps recent files */ }
  bhavCache.set(iso, out)
  return out
}
// Latest trading day with an end-of-day file
let lastSession = null
for (let d = today, k = 0; k < 10; k++, d = addDays(d, -1)) {
  if (!isTradingDay(d)) continue
  const m = await bhav(d)
  if (m.size > 100) { lastSession = d; break }
}
if (!lastSession) log.errors.push('no recent end-of-day price file found')
const lastPrices = lastSession ? await bhav(lastSession) : new Map()

// --- 5. assemble ---------------------------------------------------------------------------------------
const list = []
let detailsFetched = 0
let detailsTried = 0
// newest first, so the per-run detail budget goes to current issues
const ordered = [...bySym.values()].filter((i) => i.open).sort((a, b) => b.open.localeCompare(a.open))
for (const ipo of ordered) {
  const prev = prevBySym.get(ipo.symbol + '|' + ipo.board) || {}
  const slug = prev.slug || slugify(ipo.name) || ipo.symbol.toLowerCase()
  const t = timetable(ipo)
  const status = statusOf(ipo, t)
  const detailFile = path.join(DETAIL_DIR, slug + '.json')
  let detail = read(detailFile, null)
  // Refresh detail while the issue is upcoming/open/closed and for 10 days after listing,
  // and fetch once for anything in the last 120 days that has no detail yet.
  const recent = ipo.close && ipo.close >= addDays(today, -120)
  const active = ['upcoming', 'open', 'closed'].includes(status) || (status === 'listed' && ipo.listingDate >= addDays(today, -7))
  if ((active || (recent && !detail && status !== 'unlisted')) && detailsTried < 70) {
    detailsTried++
    try {
      const fresh = await fetchDetail(ipo)
      detailsFetched++
      // never replace a recorded subscription with an empty one
      if (!fresh.subscription && detail?.subscription) fresh.subscription = detail.subscription
      detail = { ...(detail || {}), ...fresh }
    } catch (e) {
      if (!detail) log.notes.push(`detail ${ipo.symbol}: ${e.message}`)
    }
  }
  // listing-day price (open on listing day is the price discovered in the special pre-open session)
  let listing = prev.listing || null
  if (!listing && ipo.listingDate && ipo.listingDate <= today && (ipo.listingDate >= addDays(today, -Math.max(15, BACKFILL)))) {
    const m = await bhav(ipo.listingDate)
    const p = m.get(ipo.symbol + '|' + ipo.board)
    if (p && Number.isFinite(p.open)) listing = { date: ipo.listingDate, open: p.open, close: p.close, source: 'NSE end-of-day file for the listing date' }
  }
  const issuePrice = ipo.issuePrice
  const last = lastPrices.get(ipo.symbol + '|' + ipo.board)
  const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null)
  const row = {
    slug, symbol: ipo.symbol, board: ipo.board, name: ipo.name, status,
    open: ipo.open, close: ipo.close, listingDate: ipo.listingDate, timetable: t,
    priceLow: ipo.priceLow, priceHigh: ipo.priceHigh, issuePrice,
    lotSize: detail?.lotSize ?? null,
    lotValue: detail?.lotSize && (issuePrice || ipo.priceHigh) ? detail.lotSize * (issuePrice || ipo.priceHigh) : null,
    sizeCr: detail?.issueSize?.totalCr ?? null,
    subscription: detail?.subscription?.total ?? null,
    subscriptionAsOf: detail?.subscription?.asOf ?? null,
    listing,
    listingGainPct: listing && issuePrice ? r1(((listing.open - issuePrice) / issuePrice) * 100) : null,
    lastClose: status === 'listed' && last ? last.close : null,
    lastCloseDate: status === 'listed' && last ? lastSession : null,
    gainPct: status === 'listed' && last && issuePrice ? r1(((last.close - issuePrice) / issuePrice) * 100) : null,
    hasDetail: !!detail,
  }
  list.push(row)
  if (detail) {
    const next = { ...detail, slug, symbol: ipo.symbol, board: ipo.board, name: ipo.name }
    const before = read(detailFile, null)
    // fetchedAt alone changing is not news; keep the file stable unless content changed
    if (!before || JSON.stringify({ ...before, fetchedAt: 0 }) !== JSON.stringify({ ...next, fetchedAt: 0 })) write(detailFile, next)
  }
}
list.sort((a, b) => (b.open || '').localeCompare(a.open || '') || a.name.localeCompare(b.name))

// Recent and active issues go in ipos.json (loaded on every IPO page); older
// listings go in ipos-archive.json (loaded only for the full archive view).
const cutoff = addDays(today, -365)
const recentList = list.filter((i) => i.status !== 'listed' && i.status !== 'unlisted' ? true : (i.open || '') >= cutoff)
const archiveList = list.filter((i) => !recentList.includes(i)).map(({ timetable, hasDetail, ...rest }) => rest)
const prevArchive = read(path.join(LIVE, 'ipos-archive.json'), { ipos: [] })
const changed = JSON.stringify(prevIndex.ipos) !== JSON.stringify(recentList)
const meta = {
  lastPriceSession: lastSession,
  holidaysKnownFor: haveHolidays ? today.slice(0, 4) : null,
  coverage: 'All public issues listed on NSE (mainboard and NSE Emerge SME) since 2015. Issues listed only on BSE are not included.',
}
write(INDEX, { updatedAt: changed || !prevIndex.updatedAt ? new Date().toISOString() : prevIndex.updatedAt, ...meta, ipos: recentList })
const archChanged = JSON.stringify(prevArchive.ipos) !== JSON.stringify(archiveList)
write(path.join(LIVE, 'ipos-archive.json'), { updatedAt: archChanged || !prevArchive.updatedAt ? new Date().toISOString() : prevArchive.updatedAt, ...meta, ipos: archiveList })
log.notes.push(`${list.length} issues; ${detailsFetched} detail pages refreshed; last price session ${lastSession}`)
write(LOG, log)
console.log(JSON.stringify(log, null, 1))
