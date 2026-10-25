// One-off probe: can the CI runner reach intraday index sources, and how fresh are they?
// Read-only. Prints results; writes nothing.
import { createNseSession, fetchText } from '../data/http.mjs'

const out = (k, v) => console.log(`\n=== ${k} ===\n${typeof v === 'string' ? v : JSON.stringify(v, null, 1)}`)
const now = new Date()
out('runner time', { utc: now.toISOString(), ist: new Date(+now + 5.5 * 36e5).toISOString().replace('Z', ' IST') })

const nse = createNseSession()
for (const p of ['/api/allIndices', '/api/equity-stockIndices?index=NIFTY%2050']) {
  try {
    const j = await nse.get(p)
    const rows = j.data || []
    const pick = (n) => rows.find((r) => r.index === n || r.indexSymbol === n || r.symbol === n)
    out('NSE ' + p, {
      ok: true,
      timestamp: j.timestamp || j.metadata?.timeVal || null,
      rows: rows.length,
      nifty50: pick('NIFTY 50') ? { last: pick('NIFTY 50').last ?? pick('NIFTY 50').lastPrice, pct: pick('NIFTY 50').percentChange ?? pick('NIFTY 50').pChange } : null,
      niftyBank: pick('NIFTY BANK') ? { last: pick('NIFTY BANK').last } : null,
      sample: rows[0] || null,
    })
  } catch (e) {
    out('NSE ' + p, { ok: false, error: String(e.message || e) })
  }
}

try {
  const j = JSON.parse((await fetchText('https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%3BSEN', { retries: 0 })).text)
  out('Moneycontrol Sensex feed', { ok: true, data: j.data })
} catch (e) {
  out('Moneycontrol Sensex feed', { ok: false, error: String(e.message || e) })
}
