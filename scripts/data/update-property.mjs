// City home prices from the National Housing Bank's RESIDEX (residex.nhbonline.org.in).
// Runs on GitHub Actions and writes live/property-cities.json; the site reads it at runtime.
//
// What NHB publishes, per city and quarter:
//  - HPI @ Assessment Prices: index (base FY 2024-25 = 100) and the carpet-area price in Rs per
//    sq ft, from valuations of homes by banks and housing finance companies for home loans.
//    Given as the current quarter and as a four-quarter moving average, overall and by size.
//  - HPI @ Market Prices for Under Construction Properties: index and price (older series,
//    June 2013 to September 2024, base FY 2017-18).
// Accuracy rules: a run is written only if every series parses, covers at least MIN_CITIES of
// our 50 cities, and the latest quarter is not older than what is stored. Nothing is estimated.
// Env: RESIDEX_LOCAL_DIR to read saved responses instead of downloading (offline test).
import fs from 'node:fs'
import path from 'node:path'
import { PROPERTY_CITIES } from '../../src/data/property.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const OUT = path.join(ROOT, 'live', 'property-cities.json')
const LOG = path.join(ROOT, 'live', 'property-log.json')
const BASE = 'https://residex.nhbonline.org.in'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const MIN_CITIES = 45
const log = { runAt: new Date().toISOString(), notes: [], errors: [] }

const SERIES = {
  price4q: { reporttype: 'PIVOT_HFC_PRICE', pricemtdid: '2', file: 'dl_hfc_price' },
  priceCq: { reporttype: 'PIVOT_HFC_PRICE', pricemtdid: '1', file: 'dl_hfc_price_curq' },
  index: { reporttype: 'PIVOT_HFC_INDEX', pricemtdid: '2', file: 'dl_hfc_index' },
  ucPrice: { reporttype: 'PIVOT_UC_PRICE', pricemtdid: '2', file: 'dl_uc_price' },
  ucIndex: { reporttype: 'PIVOT_UC_INDEX', pricemtdid: '2', file: 'dl_uc_index' },
}

async function download(s) {
  if (process.env.RESIDEX_LOCAL_DIR) return fs.readFileSync(path.join(process.env.RESIDEX_LOCAL_DIR, `${s.file}.txt`), 'utf8')
  let last
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(BASE + '/Dashboard/GetFileDataToDownload', {
        method: 'POST', signal: AbortSignal.timeout(120000),
        headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Referer: BASE + '/', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams({ reporttype: s.reporttype, qtr: '0', cityid: '0', pricemtdid: s.pricemtdid, lang: '0' }).toString(),
      })
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      return await r.text()
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 4000 * a)) }
  }
  throw last
}

const MONTH = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }
const LAST_DAY = { '03': '31', '06': '30', '09': '30', '12': '31' }
// "Jun 2026", "Jun- 2026", "Jun--2013", "DEC 2018", "JUN--2018" -> "2026-06-30" (quarter end)
function quarterEnd(label) {
  const m = String(label).trim().match(/^([A-Za-z]{3})[a-z]*[\s-]*(\d{4})$/)
  if (!m) return null
  const mm = MONTH[m[1].toLowerCase()]
  return mm && LAST_DAY[mm] ? `${m[2]}-${mm}-${LAST_DAY[mm]}` : null
}
const num = (v) => {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}
const parse = (txt) => {
  const j = JSON.parse(txt)
  if (j.status !== 'Success') throw new Error(`status ${j.status}`)
  return JSON.parse(j.data)
}
const bandKeys = (row) => {
  const ks = Object.keys(row)
  return {
    composite: ks.find((k) => /^Composite/i.test(k)),
    small: ks.find((k) => /^<=\s*60/.test(k)),
    mid: ks.find((k) => /^>\s*60.*<=\s*110/.test(k)),
    large: ks.find((k) => /^>\s*110/.test(k)),
  }
}

async function main() {
  const raw = {}
  for (const [k, s] of Object.entries(SERIES)) {
    try { raw[k] = parse(await download(s)) } catch (e) { log.errors.push(`${k}: ${e.message}`) }
  }
  if (log.errors.length) return finish()

  const byNhb = Object.fromEntries(PROPERTY_CITIES.map((c) => [c.nhb, c]))
  const cities = {}
  const city = (nhb) => {
    const c = byNhb[nhb]
    if (!c) { if (!log.notes.includes(`unknown city ${nhb}`)) log.notes.push(`unknown city ${nhb}`); return null }
    return (cities[c.slug] ||= { ...c, assessment: {}, underConstruction: {} })
  }
  // long-format price tables: one row per city and quarter
  for (const [key, field] of [['price4q', 'avg4q'], ['priceCq', 'quarter'], ['ucPrice', 'price']]) {
    const rows = raw[key]
    const bk = bandKeys(rows[0] || {})
    for (const r of rows) {
      const c = city(r.City)
      const q = quarterEnd(r.Quarter)
      if (!c) continue
      if (!q) { log.errors.push(`${key}: bad quarter "${r.Quarter}"`); continue }
      const target = key === 'ucPrice' ? c.underConstruction : c.assessment
      const t = (target[q] ||= {})
      t[field] = { composite: num(r[bk.composite]), small: num(r[bk.small]), mid: num(r[bk.mid]), large: num(r[bk.large]) }
    }
  }
  // wide index tables: one row per city, one column per quarter
  for (const [key, target] of [['index', 'assessment'], ['ucIndex', 'underConstruction']]) {
    for (const r of raw[key]) {
      const c = city(r.City)
      if (!c) continue
      for (const [col, v] of Object.entries(r)) {
        if (col === 'City') continue
        const q = quarterEnd(col)
        if (!q) { log.errors.push(`${key}: bad quarter column "${col}"`); continue }
        ;(c[target][q] ||= {}).index = num(v)
      }
    }
  }
  const list = Object.values(cities).map((c) => {
    const series = (obj) => Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)).map(([q, v]) => ({ q, ...v }))
    return { ...c, assessment: series(c.assessment), underConstruction: series(c.underConstruction) }
  })
  const withLatest = list.filter((c) => c.assessment.length && c.assessment[c.assessment.length - 1].avg4q?.composite)
  if (withLatest.length < MIN_CITIES) log.errors.push(`only ${withLatest.length} cities with a current price`)
  const latestQ = list.flatMap((c) => c.assessment.map((x) => x.q)).sort().pop()
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null
  if (prev?.latestQuarter && latestQ < prev.latestQuarter) log.errors.push(`latest quarter ${latestQ} is older than stored ${prev.latestQuarter}`)
  const missing = PROPERTY_CITIES.filter((c) => !cities[c.slug]).map((c) => c.nhb)
  if (missing.length) log.notes.push(`not in NHB data: ${missing.join(', ')}`)
  if (log.errors.length) return finish()

  const out = {
    latestQuarter: latestQ,
    source: { name: 'National Housing Bank, RESIDEX', url: 'https://residex.nhbonline.org.in/' },
    notes: {
      assessment: 'HPI @ Assessment Prices: carpet-area price in Rs per sq ft from valuations by banks and housing finance companies; index base FY 2024-25 = 100',
      underConstruction: 'HPI @ Market Prices for Under Construction Properties: Rs per sq ft carpet; index base FY 2017-18 = 100; series runs June 2013 to September 2024',
    },
    cities: list.sort((a, b) => a.name.localeCompare(b.name)),
  }
  const changed = !prev || JSON.stringify({ ...prev, updatedAt: 0 }) !== JSON.stringify({ ...out, updatedAt: 0 })
  if (changed) {
    out.updatedAt = new Date().toISOString()
    fs.writeFileSync(OUT, JSON.stringify(out))
    log.notes.push(`wrote ${list.length} cities, latest quarter ${latestQ}`)
  } else log.notes.push('no change')
  finish()
}
function finish() {
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
  console.log(JSON.stringify(log, null, 1))
}
main().catch((e) => { log.errors.push(String(e.message || e)); finish() })
