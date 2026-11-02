// Daily kitchen-staple prices. Runs on GitHub Actions and writes live/prices.json,
// which the site reads at runtime (no Netlify rebuild needed).
//
// Source: the Department of Consumer Affairs, Price Monitoring Division, which
// publishes the all-India average retail (₹/kg) and wholesale (₹/quintal) price
// of each monitored commodity on the public home page of fcainfoweb.nic.in.
// The centre-wise reports on the same site sit behind a CAPTCHA; we do not use them.
//
// Accuracy rules (same as the other data jobs):
//  - A day's prices are written only if the page parses, carries its own date,
//    that date is not in the future or older than what is stored, and enough
//    commodities have a positive numeric price.
//  - If anything fails, the stored file is left as it was and the reason is
//    recorded in live/prices-log.json. Nothing is estimated.
import fs from 'node:fs'
import path from 'node:path'
import { fetchText, todayIST } from './http.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const FILE = path.join(ROOT, 'live', 'prices.json')
const LOG = path.join(ROOT, 'live', 'prices-log.json')
const SOURCE_URL = 'https://fcainfoweb.nic.in/'
const HISTORY_MAX = 800
const MIN_ITEMS = 20

const store = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {}
store.history ||= { retail: {}, wholesale: {} }
const log = { runAt: new Date().toISOString(), accepted: [], notes: [], errors: [] }

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const isoFromDmy = (s) => {
  const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export function parse(html) {
  const out = {}
  for (const kind of ['Retail', 'Wholesale']) {
    const prices = {}
    const re = new RegExp(`id="GridView${kind}Group([A-Z])_ctl(\\d+)_lblCommName">([^<]*)<[\\s\\S]*?id="GridView${kind}Group\\1_ctl\\2_lblPrices">([^<]*)<`, 'g')
    for (const m of html.matchAll(re)) {
      const name = decode(m[3])
      const v = Number(decode(m[4]).replace(/,/g, ''))
      if (name && Number.isFinite(v) && v > 0) prices[name] = v
    }
    const dateId = kind === 'Retail' ? 'lblDate1' : 'lblDate2'
    const asOf = isoFromDmy((html.match(new RegExp(`id="${dateId}">([^<]*)<`)) || [])[1] || '')
    out[kind.toLowerCase()] = { asOf, prices }
  }
  return out
}

async function main() {
  let html
  if (process.env.PRICES_HTML) html = fs.readFileSync(process.env.PRICES_HTML, 'utf8')
  else html = (await fetchText(SOURCE_URL, { retries: 2, timeoutMs: 40000 })).text
  const parsed = parse(html)
  const today = todayIST()
  let changed = false
  for (const kind of ['retail', 'wholesale']) {
    const p = parsed[kind]
    const n = Object.keys(p.prices).length
    if (!p.asOf) { log.errors.push(`${kind}: no date on the page`); continue }
    if (p.asOf > today) { log.errors.push(`${kind}: date ${p.asOf} is after today (${today})`); continue }
    if (n < MIN_ITEMS) { log.errors.push(`${kind}: only ${n} prices parsed`); continue }
    const prev = store[kind]
    if (prev?.asOf && p.asOf < prev.asOf) { log.errors.push(`${kind}: page date ${p.asOf} is older than stored ${prev.asOf}`); continue }
    // large one-day moves are recorded, not blocked: vegetable prices do jump
    for (const [name, v] of Object.entries(p.prices)) {
      const old = prev?.prices?.[name]
      if (old && Math.abs(v / old - 1) > 0.5) log.notes.push(`${kind} ${name}: ${old} -> ${v} (${p.asOf})`)
    }
    if (JSON.stringify(prev) !== JSON.stringify({ asOf: p.asOf, prices: p.prices })) changed = true
    store[kind] = { asOf: p.asOf, prices: p.prices }
    const h = (store.history[kind] ||= {})
    for (const [name, v] of Object.entries(p.prices)) {
      const arr = (h[name] ||= [])
      const i = arr.findIndex(([d]) => d === p.asOf)
      if (i >= 0) arr[i] = [p.asOf, v] // same date re-published (weekend figures are revised)
      else arr.push([p.asOf, v])
      arr.sort((a, b) => a[0].localeCompare(b[0]))
      if (arr.length > HISTORY_MAX) arr.splice(0, arr.length - HISTORY_MAX)
    }
    log.accepted.push(`${kind}: ${n} prices for ${p.asOf}`)
  }
  if (changed) {
    store.updatedAt = new Date().toISOString()
    store.source = { name: 'Department of Consumer Affairs, Price Monitoring Division', url: SOURCE_URL, retailUnit: '₹ per kg (milk ₹ per litre)', wholesaleUnit: '₹ per quintal' }
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(store, null, 1))
  } else log.notes.push('no change')
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
  console.log(JSON.stringify(log, null, 1))
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    log.errors.push(String(e.message || e))
    fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
    console.error(e)
    process.exit(0) // keep the stored file; the log records the failure
  })
}
