// Daily city air quality index (AQI). Runs on GitHub Actions and writes live/aqi.json and
// live/aqi/<city>.json, which the site reads at runtime (no Netlify rebuild needed).
//
// Source: Central Pollution Control Board, daily AQI bulletin, "Air Quality Index on <date>
// @ 4 PM (average of past 24 hours)", https://cpcb.nic.in/upload/Downloads/AQI_Bulletin_YYYYMMDD.pdf
// Needs `pdftotext` (poppler-utils).
//
// Accuracy rules (same as the other data jobs):
//  - A day is written only if its bulletin downloads, carries the same date, parses with no
//    missing serial numbers, and lists at least MIN_CITIES cities. Each row's AQI must fall in
//    the band of the category printed next to it (checked in aqi-parse.mjs).
//  - If a city appears twice in one bulletin, the row based on more monitoring stations is used
//    and the duplicate is logged.
//  - Nothing is estimated; failures leave stored files as they were and go to live/aqi-log.json.
// Env: BACKFILL_DAYS (default 1: today and yesterday), AQI_MAX_DATES (cap for one run).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { parseBulletin } from './aqi-parse.mjs'
import { todayIST } from './http.mjs'
import { aqiSlug, aqiName, aqiCat, AQI_STATE, aqiTier } from '../../src/data/aqi.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const DIR = path.join(ROOT, 'live', 'aqi')
const LATEST = path.join(ROOT, 'live', 'aqi.json')
const LOG = path.join(ROOT, 'live', 'aqi-log.json')
const MIN_CITIES = 100
const HISTORY_MAX = 1200
const BACKFILL = Math.max(0, Number(process.env.BACKFILL_DAYS ?? 1))
const CONCURRENCY = 4
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const SOURCE = { name: 'Central Pollution Control Board (CPCB), daily AQI bulletin', url: 'https://cpcb.nic.in/AQI_Bulletin.php' }

const log = { runAt: new Date().toISOString(), accepted: [], notes: [], errors: [] }
const urlFor = (iso) => `https://cpcb.nic.in/upload/Downloads/AQI_Bulletin_${iso.replace(/-/g, '')}.pdf`
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aqi-'))

async function bulletin(iso) {
  // offline test: read saved PDFs instead of downloading
  if (process.env.AQI_LOCAL_DIR) {
    const f = path.join(process.env.AQI_LOCAL_DIR, `AQI_Bulletin_${iso.replace(/-/g, '')}.pdf`)
    if (!fs.existsSync(f)) return { missing: true }
    return { text: execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8', maxBuffer: 32 << 20 }) }
  }
  let last
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(urlFor(iso), { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'User-Agent': UA } })
      if (r.status === 404) return { missing: true }
      const buf = Buffer.from(await r.arrayBuffer())
      if (r.status !== 200 || buf.subarray(0, 4).toString() !== '%PDF') return { missing: true, status: r.status }
      const f = path.join(tmp, `${iso}.pdf`)
      fs.writeFileSync(f, buf)
      const text = execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8', maxBuffer: 32 << 20 })
      fs.rmSync(f)
      return { text }
    } catch (e) { last = e; await new Promise((r) => setTimeout(r, 3000 * a)) }
  }
  throw last
}

// city stores, loaded on first use
const stores = new Map()
function store(slug) {
  if (!stores.has(slug)) {
    const f = path.join(DIR, `${slug}.json`)
    stores.set(slug, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { slug, history: [] })
  }
  return stores.get(slug)
}
const touched = new Set()
const days = {} // iso -> { cities: [...], absent: [...] }

function accept(iso, parsed) {
  const bySlug = new Map()
  for (const c of parsed.cities) {
    const slug = aqiSlug(c.name)
    const prev = bySlug.get(slug)
    if (prev) {
      log.notes.push(`${iso}: ${c.name} listed twice (AQI ${prev.aqi} on ${prev.stations} stations, ${c.aqi} on ${c.stations}); kept the one with more stations`)
      if (c.stations <= prev.stations) continue
    }
    bySlug.set(slug, { ...c, slug })
  }
  for (const c of bySlug.values()) {
    const s = store(c.slug)
    s.name = aqiName(c.name)
    const row = [iso, c.aqi, c.pollutants.join(','), c.stations, c.totalStations]
    const i = s.history.findIndex((h) => h[0] === iso)
    if (i >= 0) s.history[i] = row
    else s.history.push(row)
    s.history.sort((a, b) => a[0].localeCompare(b[0]))
    if (s.history.length > HISTORY_MAX) s.history.splice(0, s.history.length - HISTORY_MAX)
    touched.add(c.slug)
  }
  days[iso] = { cities: [...bySlug.values()], absent: parsed.absent.map(aqiName) }
  log.accepted.push(`${iso}: ${bySlug.size} cities`)
}

async function doDate(iso) {
  try {
    const b = await bulletin(iso)
    if (b.missing) { log.notes.push(`${iso}: bulletin not published${b.status ? ` (HTTP ${b.status})` : ''}`); return }
    const p = parseBulletin(b.text)
    if (p.date !== iso) { log.errors.push(`${iso}: bulletin says ${p.date}`); return }
    if (p.problems.length) { log.errors.push(`${iso}: ${JSON.stringify(p.problems).slice(0, 300)}`); return }
    if (p.cities.length < MIN_CITIES) { log.errors.push(`${iso}: only ${p.cities.length} cities parsed`); return }
    accept(iso, p)
  } catch (e) { log.errors.push(`${iso}: ${String(e.message || e).slice(0, 200)}`) }
}

const near = (hist, iso, tolerance) => {
  for (let k = 0; k <= tolerance; k++) {
    const h = hist.find((x) => x[0] === addDays(iso, -k))
    if (h) return h
  }
  return null
}

async function main() {
  const today = todayIST()
  const dates = []
  for (let i = 0; i <= BACKFILL; i++) dates.push(addDays(today, -i))
  const max = Number(process.env.AQI_MAX_DATES || dates.length)
  const list = dates.slice(0, max)
  let next = 0
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < list.length) await doDate(list[next++])
  }))

  fs.mkdirSync(DIR, { recursive: true })
  for (const slug of touched) {
    const s = store(slug)
    s.slug = slug
    s.state = AQI_STATE[slug] || null
    s.tier = aqiTier(slug)
    s.unit = 'AQI (CPCB national index, 0-500)'
    s.source = SOURCE
    s.updatedAt = new Date().toISOString()
    fs.writeFileSync(path.join(DIR, `${slug}.json`), JSON.stringify(s))
  }
  const unmapped = [...touched].filter((s) => !AQI_STATE[s])
  if (unmapped.length) log.notes.push(`no state on file for: ${unmapped.join(', ')}`)

  // latest day across this run; only move forward
  const latestIso = Object.keys(days).sort().pop()
  const current = fs.existsSync(LATEST) ? JSON.parse(fs.readFileSync(LATEST, 'utf8')) : null
  if (latestIso && (!current || latestIso >= current.date)) {
    const day = days[latestIso]
    const cities = day.cities.map((c) => {
      const h = store(c.slug).history
      const prev = near(h.filter((x) => x[0] < latestIso), addDays(latestIso, -1), 2)
      const week = h.filter((x) => x[0] > addDays(latestIso, -7) && x[0] <= latestIso)
      const yearAgo = near(h, addDays(latestIso, -365), 3)
      return {
        name: aqiName(c.name), slug: c.slug, state: AQI_STATE[c.slug] || null, tier: aqiTier(c.slug),
        aqi: c.aqi, category: aqiCat(c.aqi).name, pollutants: c.pollutants, stations: c.stations, totalStations: c.totalStations,
        prev: prev ? { date: prev[0], aqi: prev[1] } : null,
        avg7: week.length >= 4 ? Math.round(week.reduce((a, x) => a + x[1], 0) / week.length) : null,
        yearAgo: yearAgo ? { date: yearAgo[0], aqi: yearAgo[1] } : null,
      }
    }).sort((a, b) => b.aqi - a.aqi)
    cities.forEach((c, i) => { c.rank = i + 1 })
    const counts = Object.fromEntries(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'].map((k) => [k, cities.filter((c) => c.category === k).length]))
    fs.writeFileSync(LATEST, JSON.stringify({ date: latestIso, updatedAt: new Date().toISOString(), source: { ...SOURCE, bulletin: urlFor(latestIso) }, counts, cities, absent: day.absent }))
  }
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
  console.log(JSON.stringify({ accepted: log.accepted.length, notes: log.notes.slice(0, 20), errors: log.errors }, null, 1))
}

main().catch((e) => {
  log.errors.push(String(e.message || e))
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
  console.error(e)
  process.exit(0)
})
