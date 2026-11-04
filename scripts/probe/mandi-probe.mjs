// One-off probe (round 4): the commodity names in one day's data, and the largest page size.
// The key comes from the DATAGOVIN_API_KEY secret and is never written to any file.
import fs from 'node:fs'
const RES = '35985678-0d79-46b4-9ed6-6f13308a1d24'
const key = process.env.DATAGOVIN_API_KEY
fs.mkdirSync('live/debug', { recursive: true })
const out = { runAt: new Date().toISOString(), hasKey: !!key }
const base = `https://api.data.gov.in/resource/${RES}?api-key=${encodeURIComponent(key || '')}&format=json`
const get = async (qs) => {
  let last
  for (let a = 1; a <= 4; a++) {
    try { return await (await fetch(`${base}&${qs}`, { signal: AbortSignal.timeout(120000) })).json() }
    catch (e) { last = e; out.retries = (out.retries || 0) + 1; await new Promise((r) => setTimeout(r, 4000 * a)) }
  }
  throw last
}
if (key) {
  try {
    const t0 = Date.now()
    const date = '03/11/2026'
    const first = await get(`limit=500&offset=0&filters[Arrival_Date]=${date}`)
    out.total = first.total; out.firstCount = first.count
    let rows = first.records || []
    for (let off = rows.length; off < first.total && off < 40000; off += 500) {
      const j = await get(`limit=500&offset=${off}&filters[Arrival_Date]=${date}`)
      if (!j.records?.length) break
      rows = rows.concat(j.records)
    }
    out.fetched = rows.length; out.seconds = Math.round((Date.now() - t0) / 1000)
    const c = {}
    for (const r of rows) c[r.Commodity] = (c[r.Commodity] || 0) + 1
    out.commodities = Object.entries(c).sort((a, b) => b[1] - a[1])
    out.states = [...new Set(rows.map((r) => r.State))].sort()
    out.priceTypes = [typeof rows[0]?.Modal_Price, rows.filter((r) => !(Number(r.Modal_Price) > 0)).length]
  } catch (e) { out.error = String(e.cause?.code || e.message) }
}
fs.writeFileSync('live/debug/mandi-probe.json', JSON.stringify(out))
console.log(JSON.stringify(out).slice(0, 1500))
