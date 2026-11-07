// One-off: fetch official district-level sources that the build sandbox cannot reach.
// Census 2011 Primary Census Abstract (India, states and districts) from censusindia.gov.in,
// and RBI's quarterly deposits-and-credit publication pages (to find district tables).
// Files go to data/raw/ (kept for provenance) and a report to live/debug/district-probe.json.
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const out = { runAt: new Date().toISOString(), files: {}, pages: {} }
fs.mkdirSync('data/raw/census-2011', { recursive: true })
fs.mkdirSync('data/raw/rbi', { recursive: true })
fs.mkdirSync('live/debug', { recursive: true })

async function get(url, ms = 90000) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(ms), headers: { 'User-Agent': UA, Accept: '*/*' } })
  return { status: r.status, url: r.url, type: r.headers.get('content-type'), buf: Buffer.from(await r.arrayBuffer()) }
}
async function file(key, url, dest) {
  try {
    const r = await get(url)
    out.files[key] = { status: r.status, type: r.type, bytes: r.buf.length, finalUrl: r.url }
    if (r.status === 200 && r.buf.length > 10000 && !/html/i.test(r.type || '')) fs.writeFileSync(dest, r.buf)
  } catch (e) { out.files[key] = { error: String(e.cause?.code || e.message) } }
}
async function page(key, url) {
  try {
    const r = await get(url, 60000)
    const html = r.buf.toString('utf8')
    fs.writeFileSync(`data/raw/rbi/${key}.html`, html)
    const links = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]).filter((h) => /xls|csv|zip|district|PublicationReport|Publications/i.test(h))
    out.pages[key] = { status: r.status, bytes: html.length, finalUrl: r.url, links: [...new Set(links)].slice(0, 120) }
  } catch (e) { out.pages[key] = { error: String(e.cause?.code || e.message) } }
}

await file('census_pca_india_state_district', 'https://censusindia.gov.in/nada/index.php/catalog/6191/download/9268/DDW_PCA0000_2011_Indiastatedist.xlsx', 'data/raw/census-2011/DDW_PCA0000_2011_Indiastatedist.xlsx')
await file('census_pca_old_url', 'http://censusindia.gov.in/pca/DDW_PCA0000_2011_Indiastatedist.xlsx', 'data/raw/census-2011/DDW_PCA0000_2011_Indiastatedist_old.xlsx')
await page('rbi_qsdc', 'https://www.rbi.org.in/Scripts/QuarterlyPublications.aspx?head=Quarterly%20Statistics%20on%20Deposits%20and%20Credit%20of%20Scheduled%20Commercial%20Banks')
await page('rbi_quarterly_index', 'https://www.rbi.org.in/Scripts/QuarterlyPublications.aspx')
await page('rbi_bsr', 'https://www.rbi.org.in/Scripts/AnnualPublications.aspx?head=Basic%20Statistical%20Returns%20of%20Scheduled%20Commercial%20Banks%20in%20India')

fs.writeFileSync('live/debug/district-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 4000))
