// One-off probe (round 2): NHB RESIDEX data downloads and a city dashboard (ward level).
import fs from 'node:fs'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const BASE = 'https://residex.nhbonline.org.in'
const DIR = 'data/raw/property/residex'
fs.mkdirSync(DIR, { recursive: true })
const out = { runAt: new Date().toISOString(), items: {} }
let cookie = ''
async function req(key, p, form) {
  try {
    const r = await fetch(BASE + p, {
      method: form ? 'POST' : 'GET', redirect: 'follow', signal: AbortSignal.timeout(120000),
      headers: { 'User-Agent': UA, Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest', Referer: BASE + '/', ...(cookie ? { Cookie: cookie } : {}), ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}) },
      body: form ? new URLSearchParams(form).toString() : undefined,
    })
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=\s*\w+=)/).map((c) => c.split(';')[0]).join('; ')
    const t = await r.text()
    fs.writeFileSync(`${DIR}/${key}.txt`, t)
    out.items[key] = { p, status: r.status, type: r.headers.get('content-type'), bytes: t.length, head: t.slice(0, 400) }
    return t
  } catch (e) { out.items[key] = { p, error: String(e.cause?.code || e.message) }; return '' }
}
await req('home', '/')
for (const [k, type, ia] of [['dl_hfc_price', 'HFC', 'PRICE'], ['dl_hfc_index', 'HFC', 'INDEX'], ['dl_uc_price', 'UC', 'PRICE'], ['dl_uc_index', 'UC', 'INDEX']]) {
  await req(k, '/Dashboard/GetFileDataToDownload', { reporttype: `PIVOT_${type}_${ia}`, qtr: '0', cityid: '0', pricemtdid: '2', lang: '0' })
}
await req('dl_hfc_price_curq', '/Dashboard/GetFileDataToDownload', { reporttype: 'PIVOT_HFC_PRICE', qtr: '0', cityid: '0', pricemtdid: '1', lang: '0' })
const scroll = await req('scroll', '/Dashboard/GetResidexPriceScroll', { reporttype: 'CITY_HFC', qtr: '', cityid: '0', pricemtdid: '2' })
let cities = []
try { cities = JSON.parse(JSON.parse(scroll).data) } catch {}
out.cityCount = cities.length
for (const name of ['Mumbai', 'Delhi', 'Kanpur']) {
  const c = cities.find((x) => x.CITY === name)
  if (!c) continue
  const enc = await req(`enc_${name}`, `/DashboardBY2024/EncryptCityId?cityid=${c.CITY_ID}`)
  const html = await req(`city_${name}`, `/DashboardBY2024/DashboardBY2024?sfjy=${encodeURIComponent(enc.trim())}`)
  const scripts = [...new Set([...html.matchAll(/src="(\/customappscripts\/[^"]+)"/g)].map((m) => m[1].split('?')[0]))]
  out.items[`city_${name}`].scripts = scripts
  if (name === 'Mumbai') for (const [i, s] of scripts.entries()) await req(`cityjs_${i}`, s)
}
fs.mkdirSync('live/debug', { recursive: true })
fs.writeFileSync('live/debug/residex-probe.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1).slice(0, 6000))
