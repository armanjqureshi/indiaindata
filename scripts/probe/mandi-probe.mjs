// One-off probe: shows the field names and a sample of the data.gov.in mandi-price API.
// The key comes from the DATAGOVIN_API_KEY secret and is never written to any file.
import fs from 'node:fs'
const RES = '35985678-0d79-46b4-9ed6-6f13308a1d24'
const key = process.env.DATAGOVIN_API_KEY
fs.mkdirSync('live/debug', { recursive: true })
const out = { runAt: new Date().toISOString(), hasKey: !!key }
import dns from 'node:dns/promises'
out.dns = {}
for (const h of ['api.data.gov.in', 'www.data.gov.in', 'agmarknet.gov.in']) {
  try { out.dns[h] = await dns.resolve4(h) } catch (e) { out.dns[h] = String(e.code || e.message) }
}
out.reach = {}
for (const u of ['https://api.data.gov.in/', 'https://www.data.gov.in/', 'https://agmarknet.gov.in/']) {
  try { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); out.reach[u] = r.status } catch (e) { out.reach[u] = String(e.cause?.code || e.cause?.message || e.message) }
}
if (key) {
  try {
    const u = `https://api.data.gov.in/resource/${RES}?api-key=${encodeURIComponent(key)}&format=json&limit=20`
    const r = await fetch(u)
    const t = await r.text()
    out.status = r.status
    try {
      const j = JSON.parse(t)
      out.keys = Object.keys(j)
      if (j.error) out.errorBody = JSON.stringify(j.error).replace(key, '***').slice(0, 400)
      out.keyLength = key.length
      out.total = j.total; out.count = j.count; out.updated = j.updated_date ?? j.updated
      out.fields = j.field ?? j.fields
      out.sample = (j.records || []).slice(0, 8)
    } catch { out.body = t.slice(0, 500).replace(key, '***') }
  } catch (e) { out.error = String(e.cause?.code || e.message); out.cause = String(e.cause?.message || '') }
}
fs.writeFileSync('live/debug/mandi-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 3000))
