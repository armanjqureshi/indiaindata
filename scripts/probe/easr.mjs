// One-off probe, run on the India runner: Maharashtra IGR's eASR (ready reckoner) pages.
// Saves raw pages to data/raw/property/easr/ and a report to live/debug/easr-probe.json.
import fs from 'node:fs'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DIR = 'data/raw/property/easr'
fs.mkdirSync(DIR, { recursive: true })
fs.mkdirSync('live/debug', { recursive: true })
const out = { runAt: new Date().toISOString(), items: {} }
async function grab(key, url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } })
    const t = await r.text()
    fs.writeFileSync(`${DIR}/${key}.html`, t)
    const selects = [...t.matchAll(/<select[^>]*(?:name|id)="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)].map((m) => ({ id: m[1], options: [...m[2].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)</gi)].map((o) => [o[1], o[2].trim()]).slice(0, 80) }))
    const links = [...new Set([...t.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]).filter((h) => /asr|ready|rate|pdf|xls/i.test(h)))].slice(0, 80)
    out.items[key] = { url, status: r.status, finalUrl: r.url, bytes: t.length, title: (t.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim(), selects, links, hidden: [...t.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"/gi)].map((m) => m[1]) }
  } catch (e) { out.items[key] = { url, error: String(e.cause?.code || e.message) } }
}
await grab('igr_home', 'https://igrmaharashtra.gov.in/')
await grab('easr_mumbai', 'https://igrmaharashtra.gov.in/eASR/eASRCommon.aspx?hDistName=Mumbai')
await grab('easr_mumbai_sub', 'https://igrmaharashtra.gov.in/eASR/eASRCommon.aspx?hDistName=Mumbai%20Suburban')
await grab('easr_index', 'https://igrmaharashtra.gov.in/eASR/Index.aspx')
await grab('easr_new', 'https://easr.igrmaharashtra.gov.in/')
fs.writeFileSync('live/debug/easr-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.items).map(([k, v]) => [k, { status: v.status, bytes: v.bytes, error: v.error, title: v.title, selects: v.selects?.map((s) => `${s.id}:${s.options.length}`) }])), null, 1))
