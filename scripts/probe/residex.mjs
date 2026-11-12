// One-off probe: NHB RESIDEX portal scripts and press releases (residex.nhbonline.org.in).
import fs from 'node:fs'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const BASE = 'https://residex.nhbonline.org.in'
const DIR = 'data/raw/property/residex'
fs.mkdirSync(DIR, { recursive: true })
const out = { runAt: new Date().toISOString(), items: {} }
async function grab(key, p, opts = {}) {
  try {
    const r = await fetch(BASE + encodeURI(p), { redirect: 'follow', signal: AbortSignal.timeout(90000), ...opts, headers: { 'User-Agent': UA, Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest', Referer: BASE + '/', ...(opts.headers || {}) } })
    const buf = Buffer.from(await r.arrayBuffer())
    const ext = /pdf/.test(r.headers.get('content-type') || '') ? 'pdf' : /json/.test(r.headers.get('content-type') || '') ? 'json' : /sheet|excel|octet/.test(r.headers.get('content-type') || '') ? 'xlsx' : 'txt'
    if (r.status === 200) fs.writeFileSync(`${DIR}/${key}.${ext}`, buf)
    out.items[key] = { path: p, status: r.status, type: r.headers.get('content-type'), bytes: buf.length, head: ext === 'pdf' || ext === 'xlsx' ? '' : buf.toString('utf8').slice(0, 300) }
  } catch (e) { out.items[key] = { path: p, error: String(e.cause?.code || e.message) } }
}
await grab('dashboard_js', '/customappscripts/dashboard/dashboard.js')
await grab('common_js', '/customappscripts/commonsitescript.js')
await grab('chartloader_js', '/customappscripts/chartloader.js')
await grab('pr_2026q1', '/DataUploadFormats/PressRelease_English/Press Release April-June 2026.pdf')
await grab('pr_2026q0', '/DataUploadFormats/PressRelease_English/Press Release January-March 2026.pdf')
await grab('pr_2025q2', '/DataUploadFormats/PressRelease_English/Press Release July-September 2025.pdf')
// endpoints found in the scripts are tried in a second pass
const js = ['dashboard_js', 'common_js', 'chartloader_js'].map((k) => { try { return fs.readFileSync(`${DIR}/${k}.txt`, 'utf8') } catch { return '' } }).join('\n')
const eps = [...new Set([...js.matchAll(/["'`](\/[A-Za-z]+\/[A-Za-z0-9_]+)["'`]/g)].map((m) => m[1]))].slice(0, 40)
out.endpoints = eps
for (const [i, ep] of eps.entries()) await grab(`ep_${i}_get`, ep)
fs.mkdirSync('live/debug', { recursive: true })
fs.writeFileSync('live/debug/residex-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 5000))
