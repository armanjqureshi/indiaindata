// Builds live/mandi-index.json: one small summary per commodity, for the hub page.
// Run on its own (node scripts/data/mandi-index.mjs) or from update-mandi.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { MANDI_COMMODITIES } from '../../src/data/mandi.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..')
export function buildIndex() {
  const dir = path.join(ROOT, 'live', 'mandi')
  const items = {}
  let updatedAt = ''
  let asOf = ''
  for (const c of MANDI_COMMODITIES) {
    const f = path.join(dir, `${c.slug}.json`)
    if (!fs.existsSync(f)) continue
    const d = JSON.parse(fs.readFileSync(f, 'utf8'))
    if (!d.latest) continue
    const h = d.history?.india || []
    const prev = h.length >= 2 ? { date: h[h.length - 2][0], median: h[h.length - 2][1] } : null
    items[c.slug] = { name: c.name, date: d.latest.date, median: d.latest.india.median, min: d.latest.india.min, max: d.latest.india.max, markets: d.latest.india.markets, states: d.latest.india.states, prev }
    if (d.updatedAt > updatedAt) updatedAt = d.updatedAt
    if (d.latest.date > asOf) asOf = d.latest.date
  }
  const out = { updatedAt, asOf, items }
  fs.writeFileSync(path.join(ROOT, 'live', 'mandi-index.json'), JSON.stringify(out))
  return out
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const o = buildIndex()
  console.log(`index: ${Object.keys(o.items).length} commodities, as of ${o.asOf}`)
}
