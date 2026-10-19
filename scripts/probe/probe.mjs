import fs from 'node:fs'
import { createNseSession, fetchText, UA } from '../data/http.mjs'
fs.mkdirSync('out', { recursive: true })
const log = []
const save = (n, d) => fs.writeFileSync('out/' + n, typeof d === 'string' ? d : JSON.stringify(d, null, 1))
// FBIL: find API endpoints in the Angular bundle
try {
  const html = (await fetchText('https://www.fbil.org.in/')).text
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1])
  log.push('fbil scripts ' + scripts.join(','))
  let hits = new Set()
  for (const s of scripts) {
    const js = (await fetchText(new URL(s, 'https://www.fbil.org.in/').href)).text
    for (const m of js.matchAll(/["'`](\/?wasdm\/[A-Za-z0-9_\/\-?=&.]+)["'`]/g)) hits.add(m[1])
    for (const m of js.matchAll(/["'`]([A-Za-z0-9_\/\-]*(?:par|gsec|Gsec|GSec|yield|Yield)[A-Za-z0-9_\/\-]*)["'`]/g)) if (m[1].length < 80) hits.add('kw:' + m[1])
  }
  save('fbil-endpoints.txt', [...hits].join('\n'))
} catch (e) { log.push('fbil js ' + e.message) }
for (const [n, u] of [
  ['fbil-gsec-latest.txt', 'https://www.fbil.org.in/wasdm/gsec/fetch?authenticated=false'],
]) { try { save(n, (await fetchText(u, { headers: { Referer: 'https://www.fbil.org.in/' } })).text.slice(0, 3000)) } catch (e) { log.push(n + ' ' + e.message) } }
const nse = createNseSession()
for (const [n, p] of [['holidays.json', '/api/holiday-master?type=trading'], ['ipo-detail-sme.json', '/api/ipo-detail?symbol=RAVITA&series=SME']]) {
  try { save(n, await nse.get(p)); log.push(n + ' ok') } catch (e) { log.push(n + ' FAIL ' + e.message) }
}
for (const [n, u] of [
  ['old-bhav.zip', 'https://nsearchives.nseindia.com/content/historical/EQUITIES/2024/MAR/cm28MAR2024bhav.csv.zip'],
  ['udiff-2025.zip', 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20250102_F_0000.csv.zip'],
  ['sme-2025.csv', 'https://nsearchives.nseindia.com/archives/sme/bhavcopy/sme02012025.csv'],
  ['sme-2023.csv', 'https://nsearchives.nseindia.com/archives/sme/bhavcopy/sme01062023.csv'],
]) {
  try { const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://www.nseindia.com/' } }); const b = Buffer.from(await r.arrayBuffer()); log.push(`${n} ${r.status} ${b.length}`); if (n.endsWith('.csv')) save(n, b.toString().slice(0, 600)) } catch (e) { log.push(n + ' FAIL ' + e.message) }
}
save('log.txt', log.join('\n'))
