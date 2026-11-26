// One-off probe: is OpenAQ's India data (relayed from CPCB stations) current and complete enough?
// Runs without a key (low rate limit) unless OPENAQ_API_KEY is set. Writes live/debug/openaq-probe.json.
import fs from 'node:fs'
const KEY = process.env.OPENAQ_API_KEY || ''
const BASE = 'https://api.openaq.org/v3'
const out = { runAt: new Date().toISOString(), keyUsed: !!KEY, calls: [] }
async function get(path) {
  const r = await fetch(BASE + path, { headers: { Accept: 'application/json', ...(KEY ? { 'X-API-Key': KEY } : {}) }, signal: AbortSignal.timeout(60000) })
  const text = await r.text()
  const rl = Object.fromEntries([...r.headers].filter(([k]) => /ratelimit/i.test(k)))
  out.calls.push({ path, status: r.status, bytes: text.length, rl })
  try { return { status: r.status, json: JSON.parse(text) } } catch { return { status: r.status, text: text.slice(0, 300) } }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const c = await get('/countries?limit=200')
const india = c.json?.results?.find((x) => x.code === 'IN')
out.india = india ? { id: india.id, name: india.name, datetimeLast: india.datetimeLast, parameters: india.parameters?.map((p) => `${p.id}:${p.name}`) } : null
if (india) {
  await sleep(1500)
  const locs = []
  for (let page = 1; page <= 5; page++) {
    const l = await get(`/locations?countries_id=${india.id}&limit=1000&page=${page}`)
    const res = l.json?.results || []
    locs.push(...res)
    if (res.length < 1000) break
    await sleep(1500)
  }
  const now = Date.now()
  const age = (x) => (x?.datetimeLast?.utc ? (now - Date.parse(x.datetimeLast.utc)) / 3600e3 : null)
  out.locations = {
    total: locs.length,
    providers: Object.entries(locs.reduce((a, x) => ((a[x.provider?.name] = (a[x.provider?.name] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 15),
    fresh3h: locs.filter((x) => age(x) != null && age(x) <= 3).length,
    fresh24h: locs.filter((x) => age(x) != null && age(x) <= 24).length,
    sample: locs.slice(0, 5).map((x) => ({ id: x.id, name: x.name, locality: x.locality, provider: x.provider?.name, last: x.datetimeLast?.utc, sensors: x.sensors?.map((s) => s.parameter?.name) })),
  }
  const byLocality = {}
  for (const x of locs.filter((x) => age(x) != null && age(x) <= 24)) {
    const k = (x.locality || x.name || '').trim()
    byLocality[k] = (byLocality[k] || 0) + 1
  }
  out.freshLocalities = Object.keys(byLocality).length
  out.freshLocalitySample = Object.entries(byLocality).slice(0, 40)
  const want = ['Nashik', 'Delhi', 'Mumbai', 'Pune', 'Lucknow', 'Patna', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad']
  out.cityCheck = Object.fromEntries(want.map((w) => [w, locs.filter((x) => new RegExp(w, 'i').test(`${x.locality} ${x.name}`)).map((x) => ({ name: x.name, locality: x.locality, last: x.datetimeLast?.utc, provider: x.provider?.name }))]))
  await sleep(1500)
  for (const pid of [2, 1]) {
    for (const q of [`/parameters/${pid}/latest?countries_id=${india.id}&limit=1000`, `/parameters/${pid}/latest?limit=1000&countries_id=${india.id}&page=1`]) {
      const r = await get(q)
      const res = r.json?.results || []
      out[`latest_${pid}`] = { status: r.status, count: res.length, fresh3h: res.filter((m) => (now - Date.parse(m.datetime?.utc)) / 3600e3 <= 3).length, sample: res.slice(0, 3) }
      await sleep(1500)
      break
    }
  }
}
fs.mkdirSync('live/debug', { recursive: true })
fs.writeFileSync('live/debug/openaq-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify({ india: out.india, locations: out.locations && { total: out.locations.total, fresh3h: out.locations.fresh3h, fresh24h: out.locations.fresh24h, providers: out.locations.providers }, calls: out.calls.map((c) => [c.path, c.status]) }, null, 1))
