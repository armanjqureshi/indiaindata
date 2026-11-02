// One-off probe: can the CI runner reach the sources for daily kitchen-staple prices, and what do they return?
// Writes live/debug/probe-prices.json plus raw HTML snapshots. Read-only towards the sources.
import fs from 'node:fs'
import { UA } from '../data/http.mjs'

fs.mkdirSync('live/debug', { recursive: true })
const results = {}
const out = (k, v) => { results[k] = v; console.log(`\n=== ${k} ===\n${JSON.stringify(v, null, 1).slice(0, 3000)}`) }

const jar = {}
const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
async function req(url, { method = 'GET', body, headers = {} } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 40000)
  try {
    const res = await fetch(url, {
      method, body, redirect: 'follow', signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json,*/*', 'Accept-Language': 'en-IN,en;q=0.9', Cookie: cookieHeader(), ...headers },
    })
    for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i).trim()] = kv.slice(i + 1) }
    const text = await res.text()
    return { status: res.status, url: res.url, text }
  } finally { clearTimeout(t) }
}

function formFields(html) {
  const fields = []
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0]
    const g = (a) => (tag.match(new RegExp(`\\b${a}="([^"]*)"`, 'i')) || [])[1]
    fields.push({ tag: 'input', type: g('type'), name: g('name'), value: (g('value') || '').slice(0, 80), checked: /\bchecked\b/i.test(tag) })
  }
  for (const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = (m[1].match(/\bname="([^"]*)"/i) || [])[1]
    const auto = /onchange="[^"]*__doPostBack/i.test(m[1])
    const options = [...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map((o) => ({ value: (o[1].match(/value="([^"]*)"/i) || [])[1], text: o[2].trim(), selected: /selected/i.test(o[1]) }))
    fields.push({ tag: 'select', name, autopostback: auto, options: options.slice(0, 60) })
  }
  return fields
}

// 1. Consumer Affairs price monitoring reports
for (const url of ['https://fcainfoweb.nic.in/reports/report_menu_web.aspx', 'https://fcainfoweb.nic.in/']) {
  try {
    const r = await req(url)
    const name = url.includes('report_menu') ? 'fca-report-menu' : 'fca-home'
    fs.writeFileSync(`live/debug/${name}.html`, r.text)
    out(name, { status: r.status, finalUrl: r.url, bytes: r.text.length, cookies: Object.keys(jar), title: (r.text.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim(), fields: formFields(r.text), links: [...r.text.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]).filter((h) => /report|price|pms|daily/i.test(h)).slice(0, 40) })
  } catch (e) { out(url, { ok: false, error: String(e.message || e) }) }
}

// 2. India Data Portal CKAN datastore (state-level daily retail prices)
for (const host of ['https://ckandev.indiadataportal.com', 'https://indiadataportal.com', 'https://ckan.indiadataportal.com']) {
  const url = `${host}/api/3/action/datastore_search?resource_id=45f8c494-03d2-46b5-aa1a-a5e3656c3da6&limit=3&sort=date%20desc`
  try {
    const r = await req(url)
    let j = null; try { j = JSON.parse(r.text) } catch {}
    out(`idp ${host}`, { status: r.status, total: j?.result?.total, fields: j?.result?.fields?.map((f) => f.id), records: j?.result?.records, raw: j ? undefined : r.text.slice(0, 300) })
  } catch (e) { out(`idp ${host}`, { ok: false, error: String(e.message || e) }) }
}

// 3. CEDA daily food prices (DoCA data, state and national level)
for (const url of ['https://dca.ceda.ashoka.edu.in/', 'https://dca.ceda.ashoka.edu.in/README.html']) {
  try {
    const r = await req(url)
    fs.writeFileSync(`live/debug/ceda-${url.endsWith('html') ? 'readme' : 'home'}.html`, r.text)
    out(`ceda ${url}`, { status: r.status, bytes: r.text.length, scripts: [...r.text.matchAll(/src="([^"]+)"/gi)].map((m) => m[1]).slice(0, 20), apiLike: [...r.text.matchAll(/["'](\/?(?:api|data|download)[^"']*)["']/gi)].map((m) => m[1]).slice(0, 30) })
  } catch (e) { out(`ceda ${url}`, { ok: false, error: String(e.message || e) }) }
}

results.runAt = new Date().toISOString()
fs.writeFileSync('live/debug/probe-prices.json', JSON.stringify(results, null, 1))
