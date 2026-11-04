// One-off probe (round 3): how to ask for the latest day's prices for one commodity.
// The key comes from the DATAGOVIN_API_KEY secret and is never written to any file.
import fs from 'node:fs'
const RES = '35985678-0d79-46b4-9ed6-6f13308a1d24'
const key = process.env.DATAGOVIN_API_KEY
fs.mkdirSync('live/debug', { recursive: true })
const out = { runAt: new Date().toISOString(), hasKey: !!key, tests: {} }
const base = `https://api.data.gov.in/resource/${RES}?api-key=${encodeURIComponent(key || '')}&format=json`
async function test(name, qs) {
  try {
    const r = await fetch(`${base}&${qs}`, { signal: AbortSignal.timeout(60000) })
    const t = await r.text()
    let j; try { j = JSON.parse(t) } catch { return (out.tests[name] = { status: r.status, body: t.slice(0, 200).replace(key, '***') }) }
    const recs = j.records || []
    out.tests[name] = {
      status: r.status, total: j.total, count: j.count, error: j.error && String(JSON.stringify(j.error)).replace(key, '***'),
      dates: [...new Set(recs.map((x) => x.Arrival_Date))].slice(0, 6),
      first: recs[0], last: recs[recs.length - 1],
    }
  } catch (e) { out.tests[name] = { error: String(e.cause?.code || e.message) } }
}
if (key) {
  await test('latest_sorted', 'limit=5&sort[Arrival_Date]=desc')
  await test('onion_sorted', 'limit=5&filters[Commodity]=Onion&sort[Arrival_Date]=desc')
  await test('onion_date_ddmmyyyy', 'limit=5&filters[Commodity]=Onion&filters[Arrival_Date]=03/11/2026')
  await test('onion_date_iso', 'limit=5&filters[Commodity]=Onion&filters[Arrival_Date]=2026-11-03')
  await test('date_only_dmy', 'limit=5&filters[Arrival_Date]=03/11/2026')
  await test('date_only_dmy_2nov', 'limit=5&filters[Arrival_Date]=02/11/2026')
  await test('onion_maharashtra_dmy', 'limit=50&filters[Commodity]=Onion&filters[State]=Maharashtra&filters[Arrival_Date]=03/11/2026')
}
fs.writeFileSync('live/debug/mandi-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 3000))
