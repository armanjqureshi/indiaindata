import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { createNseSession, fetchText, UA } from '../data/http.mjs'
fs.mkdirSync('out', { recursive: true })
const save = (n, d) => fs.writeFileSync('out/' + n, typeof d === 'string' ? d : JSON.stringify(d, null, 1))
const log = []
const nse = createNseSession()
for (const [n, p] of [
  ['past.json', '/api/public-past-issues'],
  ['current.json', '/api/ipo-current-issue'],
  ['upcoming-ipo.json', '/api/all-upcoming-issues?category=ipo'],
  ['detail-tonbo.json', '/api/ipo-detail?symbol=TONBO&series=EQ'],
  ['detail-zetwerk.json', '/api/ipo-detail?symbol=ZETWERK&series=EQ'],
  ['active-tonbo.json', '/api/ipo-active-category?symbol=TONBO'],
  ['fiidii.json', '/api/fiidiiTradeReact'],
  ['refrates-cur.json', '/api/NextApi/apiClient?functionName=getReferenceRates&&type=null&&flag=CUR'],
  ['refrates-int.json', '/api/NextApi/apiClient?functionName=getReferenceRates&&type=null&&flag=INT'],
  ['refrates-com.json', '/api/NextApi/apiClient?functionName=getReferenceRates&&type=null&&flag=COM'],
  ['symdata.json', '/api/NextApi/apiClient?functionName=getSymbolData&marketType=N&series=EQ&symbol=HDFIRE'],
  ['eq-hist.json', '/api/historical/cm/equity?symbol=INFY&series=[%22EQ%22]&from=13-10-2026&to=19-10-2026'],
  ['ipo-sme-past.json', '/api/public-past-issues?category=sme'],
]) {
  try { save(n, await nse.get(p)); log.push(n + ' ok') } catch (e) { log.push(n + ' FAIL ' + e.message) }
}
// Bhavcopies (official end-of-day files)
for (const [n, u] of [
  ['bhav-cm.zip', 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20261019_F_0000.csv.zip'],
  ['bhav-sme.csv', 'https://nsearchives.nseindia.com/archives/sme/bhavcopy/sme19102026.csv'],
  ['ind-close.csv', 'https://nsearchives.nseindia.com/content/indices/ind_close_all_19102026.csv'],
]) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://www.nseindia.com/' } })
    const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync('out/' + n, b); log.push(`${n} ${r.status} ${b.length}`)
  } catch (e) { log.push(n + ' FAIL ' + e.message) }
}
try { execSync('cd out && unzip -o bhav-cm.zip && head -c 3000 BhavCopy*.csv > bhav-cm-head.csv && grep -E "HDFIRE|FUSIONCX|TONBO|ZETWERK" BhavCopy*.csv > bhav-cm-ipos.csv; rm -f BhavCopy*.csv bhav-cm.zip') } catch (e) { log.push('unzip ' + e.message) }
// Sensex candidates
try { save('mc-sensex.json', (await fetchText('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%3BSEN')).text) } catch (e) { log.push('mc ' + e.message) }
try {
  const g = (await fetchText('https://www.google.com/finance/quote/SENSEX:INDEXBOM', { headers: { Accept: 'text/html' } })).text
  const i = g.indexOf('data-last-price'); save('google-sensex.txt', g.slice(i - 200, i + 800))
} catch (e) { log.push('google ' + e.message) }
for (const [n, k] of [['mc-dxy.json', 'in%3BDXY'], ['mc-nifty.json', 'in%3BNSX']]) {
  try { save(n, (await fetchText('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/' + k)).text) } catch (e) { log.push(n + ' ' + e.message) }
}
for (const [n, u] of [
  ['google-dxy.txt', 'https://www.google.com/finance/quote/.DXY:INDEXDXY'],
  ['google-10y.txt', 'https://www.google.com/finance/quote/IN10Y:INDEXBOM'],
]) { try { const g = (await fetchText(u, { headers: { Accept: 'text/html' } })).text; const i = g.indexOf('data-last-price'); save(n, i > 0 ? g.slice(i - 200, i + 600) : 'no price attr; len ' + g.length) } catch (e) { log.push(n + ' ' + e.message) } }
// FBIL variants
for (const [n, u] of [
  ['fbil-fetch.json', 'https://www.fbil.org.in/wasdm/refrates/fetch?authenticated=false'],
  ['fbil-gsec.json', 'https://www.fbil.org.in/wasdm/gsec/fetch?authenticated=false'],
  ['fbil-par.json', 'https://www.fbil.org.in/wasdm/parYield/fetch?authenticated=false'],
]) { try { save(n, (await fetchText(u, { headers: { Referer: 'https://www.fbil.org.in/' } })).text) } catch (e) { log.push(n + ' ' + e.message) } }
// IBJA table and EIA
try {
  const ib = (await fetchText('https://ibjarates.com/')).text
  save('ibja.txt', ib.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 6000))
} catch (e) { log.push('ibja ' + e.message) }
try { const e = (await fetchText('https://www.eia.gov/dnav/pet/hist/rbrteD.htm')).text; save('eia.txt', e.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(-2500)) } catch (e) { log.push('eia ' + e.message) }
try { const e = (await fetchText('https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls')); log.push('eia xls ' + e.text.length) } catch (e) { log.push('eia xls ' + e.message) }
// NSDL with priming
try {
  const h = await fetch('https://www.fpi.nsdl.co.in/web/Default.aspx', { headers: { 'User-Agent': UA } }); const c = (h.headers.getSetCookie?.() || []).map((x) => x.split(';')[0]).join('; '); await h.text()
  const r = await fetch('https://www.fpi.nsdl.co.in/web/Reports/Monthly.aspx', { headers: { 'User-Agent': UA, Cookie: c, Referer: 'https://www.fpi.nsdl.co.in/web/Default.aspx' } })
  save('nsdl.txt', (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000))
} catch (e) { log.push('nsdl ' + e.message) }
save('log.txt', log.join('\n'))
