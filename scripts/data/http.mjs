// Shared HTTP helpers for the scheduled data jobs (run on GitHub Actions).
// Every fetch has a timeout and limited retries; callers decide what to do on
// failure. The rule for every job: if a value can't be fetched and validated,
// leave the stored value as it is. Never write a guess.

export const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function fetchText(url, { headers = {}, retries = 2, timeoutMs = 20000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9', ...headers },
        redirect: 'follow',
        signal: ctrl.signal,
      })
      const text = await res.text()
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return { text, res }
    } catch (e) {
      clearTimeout(t)
      lastErr = e
      await sleep(1500 * (attempt + 1))
    }
  }
  throw lastErr
}

export async function fetchJson(url, opts) {
  const { text } = await fetchText(url, opts)
  return JSON.parse(text)
}

// NSE's public JSON endpoints need the cookies its website sets. One session
// object primes the cookie jar once and reuses it for every call.
export function createNseSession() {
  const jar = new Map()
  const absorb = (res) =>
    (res.headers.getSetCookie?.() || []).forEach((c) => {
      const [kv] = c.split(';')
      const i = kv.indexOf('=')
      if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1))
    })
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  let primed = false
  async function prime() {
    for (const p of ['/', '/market-data/all-upcoming-issues-ipo']) {
      try {
        const res = await fetch('https://www.nseindia.com' + p, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) })
        absorb(res)
        await res.text()
      } catch {}
    }
    primed = true
  }
  async function get(path) {
    if (!primed) await prime()
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 20000)
        const res = await fetch('https://www.nseindia.com' + path, {
          signal: ctrl.signal,
          headers: {
            'User-Agent': UA,
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
            Cookie: cookie(),
          },
        })
        absorb(res)
        const text = await res.text()
        clearTimeout(timer)
        if (!res.ok) throw new Error(`NSE HTTP ${res.status} for ${path}`)
        return JSON.parse(text)
      } catch (e) {
        lastErr = e
        await sleep(2000 * (attempt + 1))
        if (attempt === 1) await prime()
      }
    }
    throw lastErr
  }
  return { get }
}

// "19-Oct-2026" / "19-OCT-2026" / "19-10-2026" -> "2026-10-19"
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
export function isoDate(s) {
  if (!s || typeof s !== 'string') return null
  const t = s.trim()
  let m = t.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[A-Za-z]*[-\s/](\d{4})/)
  if (m) {
    const mo = MON[m[2].toLowerCase()]
    if (!mo) return null
    return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

export const num = (v) => {
  if (v === null || v === undefined) return null
  const n = parseFloat(String(v).replace(/[,₹\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

// Today's date in India (the jobs run in UTC).
export function todayIST() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}
