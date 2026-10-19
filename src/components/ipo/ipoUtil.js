import { fmt } from '../../data/live.js'

export const BOARD_LABEL = { mainboard: 'Mainboard', sme: 'SME' }
export const STATUS_LABEL = {
  open: 'Open',
  upcoming: 'Upcoming',
  closed: 'Awaiting listing',
  listed: 'Listed',
  unlisted: 'No NSE listing',
}
export const STATUS_CLASS = {
  open: 'bg-market-light text-market',
  upcoming: 'bg-news-light text-news',
  closed: 'bg-economy-light text-economy',
  listed: 'bg-ink/5 text-ink/70',
  unlisted: 'bg-ink/5 text-ink/50',
}

export function priceLabel(ipo) {
  if (ipo.issuePrice) return fmt.rupees(ipo.issuePrice)
  if (ipo.priceLow && ipo.priceHigh && ipo.priceLow !== ipo.priceHigh) return `₹${fmt.inr(ipo.priceLow, 0)}–${fmt.inr(ipo.priceHigh, 0)}`
  if (ipo.priceHigh) return fmt.rupees(ipo.priceHigh)
  return '—'
}

export function dateRange(ipo) {
  if (!ipo.open) return '—'
  const sameYear = ipo.open.slice(0, 4) === (ipo.close || ipo.open).slice(0, 4)
  return `${fmt.shortDate(ipo.open)} – ${ipo.close ? fmt.date(ipo.close, sameYear ? { day: 'numeric', month: 'short', year: 'numeric' } : undefined) : ''}`
}

export const gainClass = (v) => (v === null || v === undefined ? 'text-ink/50' : v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-ink/70')

// Registrars that run public allotment-status pages, plus the exchanges' own pages.
const REGISTRAR_LINKS = [
  [/kfin/i, 'https://ipostatus.kfintech.com/'],
  [/mufg|link intime/i, 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html'],
  [/bigshare/i, 'https://ipo.bigshareonline.com/IPO_Status.html'],
]
export function allotmentLinks(registrar) {
  const out = []
  const hit = REGISTRAR_LINKS.find(([re]) => re.test(registrar || ''))
  if (hit) out.push({ label: `Registrar (${registrar})`, url: hit[1] })
  out.push({ label: 'BSE allotment status', url: 'https://www.bseindia.com/investors/appli_check.aspx' })
  out.push({ label: 'NSE bid verification', url: 'https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids' })
  return out
}

export function median(arr) {
  const a = arr.filter((v) => Number.isFinite(v)).sort((x, y) => x - y)
  if (!a.length) return null
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
