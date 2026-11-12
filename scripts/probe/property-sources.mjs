// One-off probe: official property price sources, fetched from a GitHub-hosted runner.
// Saves raw pages and files to data/raw/property/ and a report to live/debug/property-probe.json.
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DIR = 'data/raw/property'
fs.mkdirSync(DIR, { recursive: true })
fs.mkdirSync('live/debug', { recursive: true })
const out = { runAt: new Date().toISOString(), items: {} }

async function get(url, ms = 60000) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(ms), headers: { 'User-Agent': UA, Accept: '*/*' } })
  return { status: r.status, url: r.url, type: r.headers.get('content-type'), buf: Buffer.from(await r.arrayBuffer()) }
}
async function grab(key, url, ext) {
  try {
    const r = await get(url)
    const isText = /html|json|text|xml/i.test(r.type || '')
    const name = `${key}.${ext || (isText ? 'html' : (r.type || '').includes('pdf') ? 'pdf' : 'bin')}`
    if (r.status === 200) fs.writeFileSync(`${DIR}/${name}`, r.buf)
    const t = isText ? r.buf.toString('utf8') : ''
    const links = isText ? [...new Set([...t.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((h) => /residex|hpi|price|pdf|xls|asr|rate|circle|easr|ready|reckoner|district/i.test(h)))].slice(0, 150) : []
    out.items[key] = { url, status: r.status, type: r.type, bytes: r.buf.length, finalUrl: r.url, saved: r.status === 200 ? name : null, title: (t.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim(), links }
  } catch (e) { out.items[key] = { url, error: String(e.cause?.code || e.message) } }
}

// NHB RESIDEX
await grab('nhb_residex_page', 'https://nhb.org.in/residex/')
await grab('nhb_home', 'https://nhb.org.in/')
await grab('residex_portal', 'https://residex.nhbonline.org.in/')
await grab('nhb_pr_mar26', 'https://www.nhb.org.in/wp-content/uploads/2026/06/National-Press-Release-RESIDEX-Mar26-Hindi.pdf', 'pdf')
await grab('nhb_pr_dec25', 'https://www.nhb.org.in/wp-content/uploads/2026/03/National-Press-Release-RESIDEX-Dec25-DV002.pdf', 'pdf')
await grab('nhb_pr_sep25', 'https://www.nhb.org.in/wp-content/uploads/2025/12/National-Press-Release-RESIDEX-Sep-25.pdf', 'pdf')
// RBI house price index
await grab('rbi_pr_list', 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx')
await grab('rbi_hpi_search', 'https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx')
// Maharashtra ready reckoner (eASR)
await grab('igr_home', 'https://igrmaharashtra.gov.in/')
await grab('easr_mumbai', 'https://igrmaharashtra.gov.in/eASR/eASRCommon.aspx?hDistName=Mumbai')
await grab('easr_root', 'https://igrmaharashtra.gov.in/eASR/')
await grab('easr_new', 'https://easr.igrmaharashtra.gov.in/')
// Delhi circle rates
await grab('delhi_revenue', 'https://revenue.delhi.gov.in/')
await grab('delhi_circle', 'https://revenue.delhi.gov.in/revenue/circle-rates')
await grab('delhi_doris', 'https://doris.delhigovt.nic.in/')

fs.writeFileSync('live/debug/property-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.items).map(([k, v]) => [k, { status: v.status, bytes: v.bytes, error: v.error, title: v.title }])), null, 1))
