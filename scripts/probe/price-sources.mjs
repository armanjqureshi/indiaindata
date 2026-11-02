// One-off probe (round 2): CEDA over http, its API endpoints, and DoCA's commodity list with units.
// Writes live/debug/probe-prices2.json plus raw snapshots. Read-only towards the sources.
import fs from 'node:fs'
import { UA } from '../data/http.mjs'

fs.mkdirSync('live/debug', { recursive: true })
const results = {}
const out = (k, v) => { results[k] = v; console.log(`\n=== ${k} ===\n${JSON.stringify(v, null, 1).slice(0, 2000)}`) }
async function req(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 40000)
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: '*/*' } })
    return { status: res.status, url: res.url, type: res.headers.get('content-type'), text: await res.text() }
  } finally { clearTimeout(t) }
}
const safe = async (k, fn) => { try { out(k, await fn()) } catch (e) { out(k, { ok: false, error: String(e.cause?.code || e.cause?.message || e.message || e) }) } }

await safe('doca commodity list', async () => {
  const r = await req('https://fcainfoweb.nic.in/ListofCommodity.aspx')
  fs.writeFileSync('live/debug/fca-commodities.html', r.text)
  const txt = r.text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const i = txt.search(/unit/i)
  return { status: r.status, bytes: r.text.length, excerpt: txt.slice(Math.max(0, i - 300), i + 2500) }
})

for (const base of ['http://dca.ceda.ashoka.edu.in', 'https://dca.ceda.ashoka.edu.in', 'http://dca-dev.ceda.ashoka.edu.in']) {
  await safe(`ceda ${base}`, async () => {
    const r = await req(base + '/')
    const name = base.replace(/\W+/g, '_')
    fs.writeFileSync(`live/debug/${name}.html`, r.text)
    const scripts = [...r.text.matchAll(/src="([^"]+\.js[^"]*)"/gi)].map((m) => m[1])
    const found = new Set()
    for (const s of scripts.slice(0, 8)) {
      try {
        const u = s.startsWith('http') ? s : base + (s.startsWith('/') ? '' : '/') + s
        const js = (await req(u)).text
        for (const m of js.matchAll(/["'`]((?:https?:\/\/[^"'`\s]*|\/)[^"'`\s]*(?:api|data|download|csv|json)[^"'`\s]*)["'`]/gi)) found.add(m[1].slice(0, 160))
      } catch {}
    }
    return { status: r.status, finalUrl: r.url, bytes: r.text.length, title: (r.text.match(/<title>([\s\S]*?)<\/title>/i) || [])[1], scripts, endpoints: [...found].slice(0, 60), links: [...r.text.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]).slice(0, 40) }
  })
}

results.runAt = new Date().toISOString()
fs.writeFileSync('live/debug/probe-prices2.json', JSON.stringify(results, null, 1))
