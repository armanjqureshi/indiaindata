// One-off probe: IBJA gold and silver rates (ibjarates.com) from a GitHub-hosted runner.
// Saves raw pages to data/raw/gold/ and a report to live/debug/gold-probe.json.
import fs from 'node:fs'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DIR = 'data/raw/gold'
fs.mkdirSync(DIR, { recursive: true })
fs.mkdirSync('live/debug', { recursive: true })
const out = { runAt: new Date().toISOString(), items: {} }
async function grab(key, url, opts = {}) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...opts, headers: { 'User-Agent': UA, Accept: '*/*', ...(opts.headers || {}) } })
    const buf = Buffer.from(await r.arrayBuffer())
    const t = buf.toString('utf8')
    fs.writeFileSync(`${DIR}/${key}.html`, buf)
    out.items[key] = {
      url, status: r.status, type: r.headers.get('content-type'), bytes: buf.length, finalUrl: r.url,
      title: (t.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim(),
      scripts: [...new Set([...t.matchAll(/<script[^>]*src="([^"]+)"/gi)].map((m) => m[1]))].slice(0, 30),
      links: [...new Set([...t.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]))].filter((h) => /rate|history|archive|pdf|xls|csv|api|silver|gold/i.test(h)).slice(0, 60),
      forms: [...t.matchAll(/<form[^>]*action="([^"]*)"/gi)].map((m) => m[1]),
      ids: [...new Set([...t.matchAll(/id="([^"]*(?:Gold|gold|Silver|silver|Rate|rate|lbl|txt|date|Date)[^"]*)"/g)].map((m) => m[1]))].slice(0, 80),
    }
  } catch (e) { out.items[key] = { url, error: String(e.cause?.code || e.message) } }
}
await grab('home', 'https://ibjarates.com/')
await grab('home_www', 'https://www.ibjarates.com/')
await grab('ibja_org', 'https://ibja.co/')
await grab('ibja_in', 'https://www.ibja.co/')
fs.writeFileSync('live/debug/gold-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 6000))
