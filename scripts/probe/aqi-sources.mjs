// One-off probe: can a GitHub-hosted runner reach CPCB's official AQI sources?
// Saves a few daily AQI bulletins (PDF) to data/raw/cpcb/ and a report to live/debug/aqi-probe.json.
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const out = { runAt: new Date().toISOString(), files: {}, pages: {} }
fs.mkdirSync('data/raw/cpcb', { recursive: true })
fs.mkdirSync('live/debug', { recursive: true })
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')

async function get(url, ms = 60000) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(ms), headers: { 'User-Agent': UA, Accept: '*/*' } })
  return { status: r.status, url: r.url, type: r.headers.get('content-type'), buf: Buffer.from(await r.arrayBuffer()) }
}
async function file(key, url, dest) {
  try {
    const r = await get(url)
    out.files[key] = { url, status: r.status, type: r.type, bytes: r.buf.length, finalUrl: r.url }
    if (r.status === 200 && r.buf.subarray(0, 4).toString() === '%PDF') fs.writeFileSync(dest, r.buf)
    else out.files[key].head = r.buf.subarray(0, 200).toString('utf8').replace(/\s+/g, ' ')
  } catch (e) { out.files[key] = { url, error: String(e.cause?.code || e.message) } }
}
async function page(key, url) {
  try {
    const r = await get(url, 45000)
    const t = r.buf.toString('utf8')
    out.pages[key] = { url, status: r.status, type: r.type, bytes: t.length, head: t.slice(0, 300).replace(/\s+/g, ' '), pdfs: [...new Set([...t.matchAll(/href="([^"]*AQI[^"]*\.pdf)"/gi)].map((m) => m[1]))].slice(0, 20) }
  } catch (e) { out.pages[key] = { url, error: String(e.cause?.code || e.message) } }
}

const now = new Date()
for (let i = 0; i <= 3; i++) {
  const d = ymd(new Date(now.getTime() - i * 864e5))
  await file(`bulletin_${d}`, `https://cpcb.nic.in/upload/Downloads/AQI_Bulletin_${d}.pdf`, `data/raw/cpcb/AQI_Bulletin_${d}.pdf`)
}
await file('bulletin_20251108', 'https://cpcb.nic.in/upload/Downloads/AQI_Bulletin_20251108.pdf', 'data/raw/cpcb/AQI_Bulletin_20251108.pdf')
await page('cpcb_aqi_page', 'https://cpcb.nic.in/AQI_Bulletin.php')
await page('cpcb_home', 'https://cpcb.nic.in/')
await page('airquality_cpcb', 'https://airquality.cpcb.gov.in/AQI_India/')
await page('app_cpcb', 'https://app.cpcb.gov.in/ccr/')

fs.writeFileSync('live/debug/aqi-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 4000))
