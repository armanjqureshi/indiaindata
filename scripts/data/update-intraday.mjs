// Intraday index levels, every few minutes during NSE market hours.
// Writes live/intraday.json to the "intraday" branch (one commit, force-pushed),
// so main's history stays clean and Netlify never rebuilds.
//
// Sources (unofficial, public website feeds):
//  - NSE allIndices: Nifty 50, Bank, IT, Midcap 150, Smallcap 250, India VIX
//  - Moneycontrol price feed: Sensex
// Checks: the NSE timestamp must be today (IST) and not older than the stored one; each
// move must be within a plausible range; the previous close must match our stored
// end-of-day close; Sensex must not contradict the Nifty's direction on a clear move.
import fs from 'node:fs'
import path from 'node:path'
import { createNseSession, fetchText, todayIST } from './http.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const PREV = process.env.PREV || ''
const OUT = process.env.OUT || path.join(ROOT, 'live', 'intraday.json')
const FORCE = process.env.FORCE === 'true'

const nowIST = new Date(Date.now() + 5.5 * 3600e3)
const today = todayIST()
const dow = nowIST.getUTCDay()
const hm = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes()
if (!FORCE && (dow === 0 || dow === 6 || hm < 9 * 60 + 10 || hm > 15 * 60 + 40)) {
  console.log(`Outside market hours (${nowIST.toISOString().slice(11, 16)} IST, day ${dow}). Nothing to do.`)
  process.exit(0)
}

const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const prev = read(PREV, {})
const eod = read(path.join(ROOT, 'live', 'market.json'), { items: {} })
const log = []

const INDICES = [
  ['nifty-50', 'NIFTY 50', 'Nifty 50', 12],
  ['nifty-bank', 'NIFTY BANK', 'Nifty Bank', 12],
  ['nifty-it', 'NIFTY IT', 'Nifty IT', 15],
  ['nifty-midcap-150', 'NIFTY MIDCAP 150', 'Nifty Midcap 150', 15],
  ['nifty-smallcap-250', 'NIFTY SMALLCAP 250', 'Nifty Smallcap 250', 15],
  ['india-vix', 'INDIA VIX', 'India VIX', 80],
]
const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
const n = (v) => (v === null || v === undefined || v === '' ? null : Number(String(v).replace(/,/g, '')))
const round = (v, dp = 2) => (v === null ? null : Number(v.toFixed(dp)))

const items = {}
let asOf = null
// --- NSE --------------------------------------------------------------------
try {
  const j = await createNseSession().get('/api/allIndices')
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}:\d{2})/.exec(j.timestamp || '')
  if (!m) throw new Error(`unreadable timestamp "${j.timestamp}"`)
  const date = `${m[3]}-${MON[m[2]]}-${m[1]}`
  asOf = `${date}T${m[4]}:00+05:30`
  if (date !== today && !FORCE) {
    console.log(`NSE data is for ${date}, not today (${today}): market closed or holiday. Nothing written.`)
    process.exit(0)
  }
  if (prev.asOf && asOf < prev.asOf) throw new Error(`NSE timestamp ${asOf} is older than stored ${prev.asOf}`)
  for (const [slug, name, label, maxMove] of INDICES) {
    const r = (j.data || []).find((x) => x.index === name)
    if (!r) { log.push(`${slug}: not in NSE response`); continue }
    const value = n(r.last), prevClose = n(r.previousClose)
    if (!(value > 0) || !(prevClose > 0)) { log.push(`${slug}: missing value`); continue }
    const changePct = ((value - prevClose) / prevClose) * 100
    if (Math.abs(changePct) > maxMove) { log.push(`${slug}: move ${changePct.toFixed(2)}% fails range check`); continue }
    const stored = eod.items?.[slug]
    if (stored?.value && stored.asOf < date && Math.abs(prevClose / stored.value - 1) > 0.01) {
      log.push(`${slug}: previous close ${prevClose} does not match stored close ${stored.value} (${stored.asOf})`)
      continue
    }
    items[slug] = {
      label, value, prevClose, change: round(value - prevClose), changePct: round(changePct),
      open: n(r.open), high: n(r.high), low: n(r.low), asOf,
      source: 'NSE website (allIndices feed)',
    }
  }
} catch (e) {
  console.error('NSE failed:', e.message)
  process.exit(1)
}

// --- Sensex -----------------------------------------------------------------
try {
  const d = JSON.parse((await fetchText('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%3BSEN', { retries: 1 })).text).data
  const value = n(d.pricecurrent), prevClose = n(d.priceprevclose)
  const t = String(d.lastupd || '')
  const sAsOf = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t) ? `${t.slice(0, 10)}T${t.slice(11, 16)}:00+05:30` : null
  const changePct = value > 0 && prevClose > 0 ? ((value - prevClose) / prevClose) * 100 : null
  const nifty = items['nifty-50']
  if (!(value > 0) || changePct === null) log.push('sensex: missing value')
  else if (!sAsOf || sAsOf.slice(0, 10) !== today) log.push(`sensex: feed time ${t} is not today`)
  else if (Math.abs(changePct) > 12) log.push(`sensex: move ${changePct.toFixed(2)}% fails range check`)
  else if (nifty && Math.abs(nifty.changePct) > 0.5 && Math.abs(changePct) > 0.5 && Math.sign(nifty.changePct) !== Math.sign(changePct))
    log.push(`sensex: ${changePct.toFixed(2)}% contradicts Nifty ${nifty.changePct}%`)
  else
    items.sensex = {
      label: 'Sensex', value, prevClose, change: round(value - prevClose), changePct: round(changePct),
      open: n(d.OPEN), high: n(d.HIGH), low: n(d.LOW), asOf: sAsOf, source: 'Moneycontrol price feed',
    }
} catch (e) {
  log.push(`sensex: ${e.message}`)
}

if (!items['nifty-50']) { console.error('No Nifty value passed the checks.', log); process.exit(1) }

// --- today's points (one per minute, today only) -------------------------------
const hhmm = asOf.slice(11, 16)
const points = prev.session === today ? prev.points || {} : {}
for (const k of ['nifty-50', 'sensex', 'nifty-bank', 'india-vix']) {
  if (!items[k]) continue
  const arr = (points[k] || []).filter((p) => p[0] !== hhmm)
  arr.push([hhmm, items[k].value])
  arr.sort((a, b) => a[0].localeCompare(b[0]))
  points[k] = arr.slice(-120)
}

const out = { updatedAt: new Date().toISOString(), session: today, asOf, items, points, notes: log }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log(`Wrote ${Object.keys(items).length} items as of ${hhmm} IST.`, log.length ? log : '')
