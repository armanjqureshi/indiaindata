const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
async function get(url, headers = {}, n = 600) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9', ...headers }, redirect: 'follow' })
    const t = await r.text()
    return { status: r.status, len: t.length, head: t.slice(0, n).replace(/\s+/g, ' '), _set: r.headers.getSetCookie?.() || [] }
  } catch (e) { return { status: 'ERR', err: String(e).slice(0, 200) } }
}
const out = {}
// NSE session
const jar = new Map()
const take = (r) => (r._set || []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)) })
take(await get('https://www.nseindia.com/', { Accept: 'text/html' }))
take(await get('https://www.nseindia.com/market-data/all-upcoming-issues-ipo', { Accept: 'text/html' }))
const ck = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
const nse = async (p, n = 1500) => { const r = await get('https://www.nseindia.com' + p, { Cookie: ck(), Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo', Accept: 'application/json' }, n); take(r); delete r._set; return r }
const ai = await nse('/api/allIndices', 200000)
try { const j = JSON.parse(ai.head.length ? (await (await fetch('https://www.nseindia.com/api/allIndices', { headers: { 'User-Agent': UA, Cookie: ck(), Referer: 'https://www.nseindia.com/' } })).text()) : '{}'); out['nse vix'] = j.data?.find((d) => /VIX/i.test(d.index)); out['nse ts'] = j.timestamp; out['nse dates'] = { previousDay: j.dates?.previousDay, oneWeekAgo: j.dates?.oneWeekAgo } } catch (e) { out['nse vix'] = String(e) }
out['nse ipo-detail TONBO'] = await nse('/api/ipo-detail?symbol=TONBO&series=EQ', 4000)
out['nse active-category TONBO'] = await nse('/api/ipo-active-category?symbol=TONBO', 2500)
out['nse past (sample SME)'] = await nse('/api/public-past-issues', 200)
out['nse upcoming sme'] = await nse('/api/all-upcoming-issues?category=sme', 1200)
out['nse current sme?'] = await nse('/api/ipo-current-issue?category=sme', 800)
out['nse quote HDFIRE?'] = await nse('/api/quote-equity?symbol=TONBO', 600)
out['nse idx hist'] = await nse('/api/historical/indicesHistory?indexType=NIFTY%2050&from=01-10-2026&to=19-10-2026', 800)
out['nse ref rate'] = await nse('/api/NextApi/apiClient?functionName=getReferenceRates&&type=null&&flag=CUR', 800)
out['nse cur'] = await nse('/api/currency-derivatives?index=USDINR', 400)
// Sensex alternatives
out['google sensex'] = await get('https://www.google.com/finance/quote/SENSEX:INDEXBOM', { Accept: 'text/html' }, 200)
out['bse web'] = await get('https://www.bseindia.com/', { Accept: 'text/html' }, 200)
out['bse api alt'] = await get('https://api.bseindia.com/RealTimeBseIndiaAPI/api/GetSensexData/w', { Referer: 'https://www.bseindia.com/', Origin: 'https://www.bseindia.com' }, 300)
out['stooq brent'] = await get('https://stooq.com/q/l/?s=cb.f&f=sd2t2ohlc&h&e=csv', {}, 300)
out['stooq sensex'] = await get('https://stooq.com/q/l/?s=^snx&f=sd2t2ohlc&h&e=csv', {}, 300)
out['stooq usdinr'] = await get('https://stooq.com/q/l/?s=usdinr&f=sd2t2ohlc&h&e=csv', {}, 300)
out['stooq dxy'] = await get('https://stooq.com/q/l/?s=dx.f&f=sd2t2ohlc&h&e=csv', {}, 300)
out['moneycontrol sensex'] = await get('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%3BSEN', {}, 500)
out['moneycontrol 10y'] = await get('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%3BGIND10Y', {}, 500)
out['fbil api1'] = await get('https://www.fbil.org.in/wasdm/refrates/fetchfiltered?fromDate=2026-10-16&toDate=2026-10-19&authenticated=false', { Referer: 'https://www.fbil.org.in/' }, 600)
out['fbil api2'] = await get('https://www.fbil.org.in/wasdm/refrates/fetch?authenticated=false', { Referer: 'https://www.fbil.org.in/' }, 600)
out['ccil'] = await get('https://www.ccilindia.com/web/ccil/tenor-wise-yields', { Accept: 'text/html' }, 300)
out['eia brent'] = await get('https://www.eia.gov/dnav/pet/hist/rbrteD.htm', { Accept: 'text/html' }, 200)
// IBJA table snippet
const ib = await (await fetch('https://ibjarates.com/', { headers: { 'User-Agent': UA } })).text()
const m = ib.match(/Gold\s*999[\s\S]{0,1500}/i); out['ibja snippet'] = m ? m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700) : 'no match'
const nsdl = await (await fetch('https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx', { headers: { 'User-Agent': UA } })).text()
out['nsdl snippet'] = nsdl.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500)
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(30), JSON.stringify(v))
