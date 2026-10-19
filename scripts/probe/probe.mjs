// One-off probe: which data sources respond from GitHub-hosted runners.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
async function get(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*', ...headers }, redirect: 'follow' })
    const t = await r.text()
    return { status: r.status, len: t.length, head: t.slice(0, 300).replace(/\s+/g, ' '), cookies: r.headers.getSetCookie?.() || [] }
  } catch (e) { return { status: 'ERR', err: String(e).slice(0, 200) } }
}
const out = {}
// Yahoo chart API
for (const s of ['^NSEI', '^BSESN', '^INDIAVIX', 'INR=X', 'BZ=F', 'DX-Y.NYB', 'EURINR=X'])
  out['yahoo ' + s] = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`)
// NSE with cookie priming
const home = await get('https://www.nseindia.com/', { Accept: 'text/html' })
out['nse home'] = { status: home.status, len: home.len }
const cookie = (home.cookies || []).map((c) => c.split(';')[0]).join('; ')
const nseH = { Cookie: cookie, Referer: 'https://www.nseindia.com/', Accept: 'application/json' }
for (const p of ['/api/allIndices', '/api/ipo-current-issue', '/api/all-upcoming-issues?category=ipo', '/api/public-past-issues', '/api/fiidiiTradeReact', '/api/allIndices?index=INDIA%20VIX'])
  out['nse ' + p] = await get('https://www.nseindia.com' + p, nseH)
// BSE
const bseH = { Referer: 'https://www.bseindia.com/', Origin: 'https://www.bseindia.com', Accept: 'application/json' }
out['bse sensex'] = await get('https://api.bseindia.com/BseIndiaAPI/api/GetSensexData/w', bseH)
out['bse ipo'] = await get('https://api.bseindia.com/BseIndiaAPI/api/IPOIssues/w?flag=C&type=All', bseH)
// FX references
out['frankfurter'] = await get('https://api.frankfurter.app/latest?from=USD&to=INR,EUR')
out['ecb inr'] = await get('https://data-api.ecb.europa.eu/service/data/EXR/D.INR.EUR.SP00.A?lastNObservations=3&format=jsondata')
out['fbil'] = await get('https://www.fbil.org.in/')
out['ibja'] = await get('https://ibjarates.com/', { Accept: 'text/html' })
out['rbi refrate'] = await get('https://www.rbi.org.in/Scripts/ReferenceRateArchive.aspx', { Accept: 'text/html' })
out['nsdl fpi'] = await get('https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx', { Accept: 'text/html' })
out['chittorgarh'] = await get('https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/', { Accept: 'text/html' })
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(48), JSON.stringify(v))
